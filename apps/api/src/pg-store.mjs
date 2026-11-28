// PostgreSQL store. The database is the authority on conflicts: every reservation is a row in
// booking_allocations, whose exclusion constraint rejects overlapping active ranges on the same resource.
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { SEED_USERS, SEED_RESOURCES, SEED_LISTINGS, allMarketResources, createCatalog } from './catalog.mjs';
import { HOLD_TTL_MS, HttpError, capturePlan, captureResults, refundEvent, newId } from './rules.mjs';

const SCHEMA_FILE = new URL('../../../db/schema.sql', import.meta.url);
const OVERLAP = '23P01'; // exclusion_violation
const TZ = 'Africa/Cairo';

// The athlete app sends a day as noon UTC on the Cairo date, plus a Cairo-local start hour.
const SLOT = (d, h) => `tstzrange(
  ((((${d})::timestamptz AT TIME ZONE '${TZ}')::date + make_interval(hours => ${h})) AT TIME ZONE '${TZ}'),
  ((((${d})::timestamptz AT TIME ZONE '${TZ}')::date + make_interval(hours => ${h} + 1)) AT TIME ZONE '${TZ}'), '[)')`;

const BOOKING_SELECT = `
  SELECT b.id, b.athlete_id, b.status, b.custom_venue, b.source, b.note, b.checked_in_at, b.total_egp_minor, b.hold_expires_at, b.confirmed_at, b.created_at,
         to_char((lower(b.slot_range) AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS local_date,
         extract(hour FROM lower(b.slot_range) AT TIME ZONE '${TZ}')::int AS hour,
         array_agg(a.resource_id ORDER BY a.id) AS resource_ids,
         bool_or(a.active) AS active
    FROM sport.bookings b JOIN sport.booking_allocations a ON a.booking_id = b.id`;

// Tables added after the first schema: created on startup so existing databases get them too.
const MIGRATIONS = `CREATE TABLE IF NOT EXISTS sport.resource_schedules (
    target      TEXT PRIMARY KEY,           -- coach resource id, or 'club:<id>' for every court at a club
    weekly      JSONB NOT NULL,             -- {"0": [hours], ... "6": [hours]}, Cairo local hours, 0 = Sunday
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sport.resource_closures (
    id          TEXT PRIMARY KEY,
    target      TEXT NOT NULL,
    day         DATE NOT NULL,              -- Cairo date
    hours       INT[],                      -- NULL = closed all day
    reason      TEXT NOT NULL DEFAULT '',
    created_by  TEXT REFERENCES sport.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resource_closures_day ON sport.resource_closures (day);
-- Provider workspaces (28 Nov 2026): walk-ins/blocks, check-in, price overrides, enquiry pipeline, listing edits.
ALTER TABLE sport.bookings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'athlete';
ALTER TABLE sport.bookings ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE sport.bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS sport.resource_prices (target TEXT PRIMARY KEY, price_egp_minor BIGINT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE sport.enquiries ADD COLUMN IF NOT EXISTS trial_date DATE;
ALTER TABLE sport.enquiries ADD COLUMN IF NOT EXISTS provider_note TEXT;
ALTER TABLE sport.enquiries DROP CONSTRAINT IF EXISTS enquiries_status_check;
ALTER TABLE sport.enquiries ADD CONSTRAINT enquiries_status_check CHECK (status IN ('NEW', 'CONTACTED', 'TRIAL', 'ENROLLED', 'CLOSED'));
ALTER TABLE sport.directory_listings ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;`;

const CLOSURE_SELECT = `SELECT id, target, to_char(day, 'YYYY-MM-DD') AS day, hours, reason, created_by, created_at FROM sport.resource_closures`;
const toClosure = r => r && ({ id: r.id, target: r.target, day: r.day, hours: r.hours, reason: r.reason, createdBy: r.created_by, createdAt: r.created_at.toISOString() });
const LISTING_SELECT = `SELECT id, kind, name, sport, area, owner_user_id, published, details FROM sport.directory_listings`;
const toListing = r => r && ({ id: r.id, kind: r.kind, name: r.name, ...(r.sport ? { sport: r.sport } : {}), area: r.area,
  ...r.details, ownerId: r.owner_user_id, published: r.published });

export async function createPgStore(connectionString, { setup = true } = {}) {
  const pool = new pg.Pool({ connectionString, max: 10 });
  // An idle connection can be dropped by the server (restart, failover). Log it and let the pool reconnect;
  // without a listener Node treats it as an uncaught error and the API process exits.
  pool.on('error', err => { if (err.code !== '57P01') console.warn('PostgreSQL connection error:', err.message); });
  const catalog = createCatalog();
  const users = new Map();

  // Runs fn in a transaction. A deadlock or serialization failure is safe to retry: the transaction was rolled back.
  const RETRYABLE = new Set(['40P01', '40001']);
  const tx = async (fn, attempts = 4) => {
    for (let i = 1; ; i++) {
      const c = await pool.connect();
      try { await c.query('BEGIN'); const out = await fn(c); await c.query('COMMIT'); return out; }
      catch (e) {
        await c.query('ROLLBACK').catch(() => {});
        if (!RETRYABLE.has(e.code) || i >= attempts) throw e;
      } finally { c.release(); }
      await new Promise(r => setTimeout(r, 5 + Math.random() * 20 * i));
    }
  };
  // SKIP LOCKED: a hold another transaction has locked is left to that transaction, which expires it itself.
  const sweep = c => c.query(`
    WITH expired AS (UPDATE sport.bookings SET status = 'EXPIRED' WHERE id IN (
        SELECT id FROM sport.bookings WHERE status = 'HOLD' AND hold_expires_at <= now() ORDER BY id FOR UPDATE SKIP LOCKED)
      RETURNING id)
    UPDATE sport.booking_allocations SET active = false WHERE booking_id IN (SELECT id FROM expired)`);
  // Queue transactions that want the same resource and hour (transaction-scoped advisory locks, taken in sorted order).
  // Without this, two inserts racing on the exclusion constraint can each wait for the other and deadlock.
  // The exclusion constraint is still the final guard; the lock only turns a deadlock into an orderly wait.
  const lockSlots = (c, resourceIds, day, hour) => c.query(
    `SELECT pg_advisory_xact_lock(hashtextextended(k, 0)) FROM unnest($1::text[]) AS k ORDER BY k`,
    [[...resourceIds].map(id => `${id}@${String(day).slice(0, 10)}#${hour}`).sort()]);
  const expireIfDue = async (c, id) => {
    const { rowCount } = await c.query(`UPDATE sport.bookings SET status = 'EXPIRED' WHERE id = $1 AND status = 'HOLD' AND hold_expires_at <= now()`, [id]);
    if (rowCount) await c.query('UPDATE sport.booking_allocations SET active = false WHERE booking_id = $1', [id]);
  };

  function toBooking(r) {
    if (!r) return null;
    const rank = id => (catalog.lookup(id)?.kind === 'coach' ? 1 : 0);
    const ids = [...r.resource_ids].sort((x, y) => rank(x) - rank(y)), kinds = ids.map(id => catalog.lookup(id));
    const court = ids.find((id, i) => kinds[i]?.kind === 'court'), coach = ids.find((id, i) => kinds[i]?.kind === 'coach');
    return {
      id: r.id, athleteId: r.athlete_id, status: r.status, active: r.active,
      day: `${r.local_date}T12:00:00.000Z`, hour: r.hour,
      pitch: court && !court.includes('/') ? court : null, coach: coach || null, resource: court?.includes('/') ? court : null,
      resourceIds: ids, label: kinds.map(k => k?.name ?? '').join(' + '), customVenue: r.custom_venue,
      total: Number(r.total_egp_minor) / 100,
      holdExpiresAt: r.hold_expires_at ? r.hold_expires_at.getTime() : null,
      createdAt: r.created_at.toISOString(), confirmedAt: r.confirmed_at ? r.confirmed_at.toISOString() : null,
      source: r.source, note: r.note, checkedInAt: r.checked_in_at ? r.checked_in_at.toISOString() : null,
    };
  }
  const fetchBooking = async (c, id, lock = false) => {
    if (lock) { await c.query('SELECT 1 FROM sport.bookings WHERE id = $1 FOR UPDATE', [id]); await expireIfDue(c, id); }
    return toBooking((await c.query(`${BOOKING_SELECT} WHERE b.id = $1 GROUP BY b.id`, [id])).rows[0]);
  };

  // Schema on first run, then make the database's users and resources match catalog.mjs.
  async function init() {
    if (setup) {
      // Several API servers may start at once: a session-level advisory lock lets exactly one create the schema.
      const c = await pool.connect();
      try {
        await c.query(`SELECT pg_advisory_lock(hashtext('sport.schema'))`);
        const exists = (await c.query(`SELECT to_regclass('sport.bookings') AS t`)).rows[0].t;
        if (!exists) await c.query(await readFile(SCHEMA_FILE, 'utf8'));
        await c.query(MIGRATIONS);
      } finally {
        await c.query(`SELECT pg_advisory_unlock(hashtext('sport.schema'))`).catch(() => {});
        c.release();
      }
    }
    await tx(async c => {
      for (const u of SEED_USERS) await c.query(
        `INSERT INTO sport.users (id, role, full_name) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name`, [u.id, u.role, u.name]);
      for (const r of [...SEED_RESOURCES, ...allMarketResources()]) await c.query(
        `INSERT INTO sport.resources (id, kind, sport, name, area, fixed_venue, hourly_egp_minor, owner_user_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET kind = EXCLUDED.kind, sport = EXCLUDED.sport, name = EXCLUDED.name, area = EXCLUDED.area,
           fixed_venue = EXCLUDED.fixed_venue, hourly_egp_minor = EXCLUDED.hourly_egp_minor, owner_user_id = EXCLUDED.owner_user_id,
           metadata = EXCLUDED.metadata`,
        [r.id, r.kind, r.sport, r.name, r.area, r.fixedVenue ?? null, Math.round(r.price * 100), r.ownerId ?? null, { hours: r.hours }]);
      // Gyms and academies. While listings are sample data, catalog.mjs owns their content and owner: every start resets them,
      // so edits made in the database are reverted. published is kept (admin moderation). Once providers edit their own
      // listings, change this to insert missing rows only.
      for (const l of SEED_LISTINGS) {
        const { id, kind, name, sport = null, area, ownerId, ...details } = l;
        const price = kind === 'gym' ? l.plans.Monthly : l.price, billing = kind === 'gym' ? 'Monthly' : l.billing;
        await c.query(
          `INSERT INTO sport.directory_listings (id, kind, name, sport, area, price_egp_minor, billing_period, owner_user_id, details)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET kind = EXCLUDED.kind, name = EXCLUDED.name, sport = EXCLUDED.sport, area = EXCLUDED.area,
             owner_user_id = EXCLUDED.owner_user_id,
             -- Ownership and identity always follow the catalog; only provider-editable fields are kept once edited.
             price_egp_minor = CASE WHEN sport.directory_listings.edited_at IS NULL THEN EXCLUDED.price_egp_minor ELSE sport.directory_listings.price_egp_minor END,
             billing_period = CASE WHEN sport.directory_listings.edited_at IS NULL THEN EXCLUDED.billing_period ELSE sport.directory_listings.billing_period END,
             details = CASE WHEN sport.directory_listings.edited_at IS NULL THEN EXCLUDED.details ELSE sport.directory_listings.details END`,
          [id, kind, name, sport, area, Math.round(price * 100), billing, ownerId ?? null, details]);
      }
    });
    for (const r of (await pool.query(`SELECT id, published FROM sport.resources`)).rows) {
      const item = catalog.lookup(r.id); if (item) item.published = r.published;
    }
    for (const u of (await pool.query(`SELECT id, role, full_name FROM sport.users`)).rows) users.set(u.id, { id: u.id, role: u.role, name: u.full_name });
  }
  await init();

  // Expire holds in the background too, so providers see accurate schedules between requests.
  const sweeper = setInterval(() => pool.query('SELECT 1').then(() => tx(sweep)).catch(() => {}), 30_000);
  sweeper.unref();

  return {
    kind: 'postgres',
    users,
    lookup: id => catalog.lookup(id),
    listCatalog: async () => catalog.listPublished(),
    async setPublished(id, published) {
      const r = catalog.lookup(id); if (!r) return null;
      await pool.query('UPDATE sport.resources SET published = $2 WHERE id = $1', [id, published]);
      r.published = published; return { ...r };
    },

    async createHold(hold, athleteId) {
      const id = newId('BKG', crypto);
      try {
        return await tx(async c => {
          await lockSlots(c, hold.resourceIds, hold.day, hold.hour);
          await sweep(c);
          await c.query(
            `INSERT INTO sport.bookings (id, athlete_id, status, slot_range, custom_venue, total_egp_minor, hold_expires_at)
             VALUES ($1, $2, 'HOLD', ${SLOT('$3', '$4::int')}, $5, $6, now() + make_interval(secs => $7))`,
            [id, athleteId, hold.day, hold.hour, hold.customVenue, Math.round(hold.total * 100), HOLD_TTL_MS / 1000]);
          // Same lock order in every transaction (sorted IDs), so two holds sharing resources cannot deadlock.
          for (const rid of [...hold.resourceIds].sort()) await c.query(
            `INSERT INTO sport.booking_allocations (booking_id, resource_id, slot_range, price_egp_minor)
             SELECT $1, $2, slot_range, $3 FROM sport.bookings WHERE id = $1`,
            [id, rid, Math.round((hold.prices?.[rid] ?? catalog.lookup(rid).price) * 100)]);
          return fetchBooking(c, id);
        });
      } catch (e) {
        if (e.code === OVERLAP) throw new HttpError(409, 'One or more selected resources are no longer available at this time.');
        throw e;
      }
    },
    async createProviderBooking(hold, userId, { source, note }) {
      const id = newId('BKG', crypto);
      try {
        return await tx(async c => {
          await lockSlots(c, hold.resourceIds, hold.day, hold.hour);
          await sweep(c);
          await c.query(
            `INSERT INTO sport.bookings (id, athlete_id, status, slot_range, custom_venue, total_egp_minor, confirmed_at, source, note)
             VALUES ($1, $2, 'CONFIRMED', ${SLOT('$3', '$4::int')}, $5, $6, now(), $7, $8)`,
            [id, userId, hold.day, hold.hour, hold.customVenue, Math.round(hold.total * 100), source, note]);
          // Same lock order in every transaction (sorted IDs), so two holds sharing resources cannot deadlock.
          for (const rid of [...hold.resourceIds].sort()) await c.query(
            `INSERT INTO sport.booking_allocations (booking_id, resource_id, slot_range, price_egp_minor)
             SELECT $1, $2, slot_range, $3 FROM sport.bookings WHERE id = $1`,
            [id, rid, Math.round((hold.prices?.[rid] ?? catalog.lookup(rid).price) * 100)]);
          return fetchBooking(c, id);
        });
      } catch (e) {
        if (e.code === OVERLAP) throw new HttpError(409, 'One or more selected resources are no longer available at this time.');
        throw e;
      }
    },
    async checkIn(id) {
      await pool.query('UPDATE sport.bookings SET checked_in_at = coalesce(checked_in_at, now()) WHERE id = $1', [id]);
      return this.getBooking(id);
    },
    async getPrices() {
      return new Map((await pool.query('SELECT target, price_egp_minor FROM sport.resource_prices')).rows.map(r => [r.target, Number(r.price_egp_minor) / 100]));
    },
    async setPrice(target, price) {
      if (price === null) await pool.query('DELETE FROM sport.resource_prices WHERE target = $1', [target]);
      else await pool.query(`INSERT INTO sport.resource_prices (target, price_egp_minor) VALUES ($1, $2)
        ON CONFLICT (target) DO UPDATE SET price_egp_minor = EXCLUDED.price_egp_minor, updated_at = now()`, [target, Math.round(price * 100)]);
    },
    async getBooking(id) { return tx(async c => { await sweep(c); return fetchBooking(c, id); }); },
    async listBookings({ athleteId, activeOnly } = {}) {
      return tx(async c => {
        await sweep(c);
        const rows = (await c.query(`${BOOKING_SELECT} WHERE ($1::text IS NULL OR b.athlete_id = $1) GROUP BY b.id
          HAVING (NOT $2::bool OR bool_or(a.active)) ORDER BY b.created_at`, [athleteId ?? null, Boolean(activeOnly)])).rows;
        return rows.map(toBooking);
      });
    },
    async busyHours(day, resourceIds) {
      return tx(async c => {
        await sweep(c);
        const { rows } = await c.query(`SELECT DISTINCT extract(hour FROM lower(slot_range) AT TIME ZONE '${TZ}')::int AS h
          FROM sport.booking_allocations WHERE active AND resource_id = ANY($2::text[])
          AND lower(slot_range) >= lower(${SLOT('$1', '0')}) AND lower(slot_range) < lower(${SLOT('$1', '0')}) + interval '1 day'`,
          [day, resourceIds]);
        return rows.map(r => r.h);
      });
    },

    async capture({ bookingId, key, provider }) {
      return tx(async c => {
        await sweep(c);
        const booking = await fetchBooking(c, bookingId, true); // row lock serializes captures of one booking
        const seen = (await c.query('SELECT raw_payload FROM sport.payment_attempts WHERE idempotency_key = $1', [key])).rows[0];
        if (seen) return seen.raw_payload;

        const plan = capturePlan(booking.status);
        let outcome, attempt = 'CAPTURED';
        const queueRefund = reason => c.query(
          `INSERT INTO sport.outbox_events (aggregate_type, aggregate_id, event_type, payload) VALUES ('booking', $1, 'REFUND_REQUESTED', $2)`,
          [bookingId, refundEvent({ reason, booking, provider, key })]);

        if (plan.action === 'confirm') {
          const { rows } = await c.query(`UPDATE sport.bookings SET status = 'CONFIRMED', confirmed_at = now() WHERE id = $1 RETURNING confirmed_at`, [bookingId]);
          outcome = captureResults.confirmed(bookingId, rows[0].confirmed_at.toISOString());
        } else if (plan.action === 'late') {
          await lockSlots(c, booking.resourceIds, booking.day, booking.hour);
          await c.query('SAVEPOINT late');
          try {
            await c.query('UPDATE sport.booking_allocations SET active = true WHERE booking_id = $1', [bookingId]);
            const { rows } = await c.query(`UPDATE sport.bookings SET status = 'CONFIRMED', confirmed_at = now() WHERE id = $1 RETURNING confirmed_at`, [bookingId]);
            outcome = captureResults.confirmed(bookingId, rows[0].confirmed_at.toISOString(), true);
          } catch (e) {
            if (e.code !== OVERLAP) throw e;
            await c.query('ROLLBACK TO SAVEPOINT late');
            await c.query(`UPDATE sport.bookings SET status = 'REFUND_PENDING' WHERE id = $1`, [bookingId]);
            await queueRefund('LATE_CAPTURE_SLOT_TAKEN');
            outcome = captureResults.lateTaken(bookingId); attempt = 'REFUND_QUEUED';
          }
        } else {
          await queueRefund(plan.reason);
          outcome = captureResults.refunded(bookingId, booking.status); attempt = 'REFUND_QUEUED';
        }
        await c.query(`INSERT INTO sport.payment_attempts (id, booking_id, provider, idempotency_key, amount_egp_minor, status, raw_payload)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newId('PAY', crypto), bookingId, provider, key, Math.round(booking.total * 100), attempt, outcome]);
        return outcome;
      });
    },

    async cancel(bookingId) {
      return tx(async c => {
        await sweep(c);
        const b = await fetchBooking(c, bookingId, true);
        if (b.status === 'CANCELLED') return { httpStatus: 200, result: { bookingId, status: 'CANCELLED' } };
        if (!['HOLD', 'CONFIRMED'].includes(b.status)) return { httpStatus: 409, result: { error: `Cannot cancel a ${b.status} booking` } };
        await c.query(`UPDATE sport.bookings SET status = 'CANCELLED', cancelled_at = now() WHERE id = $1`, [bookingId]);
        await c.query('UPDATE sport.booking_allocations SET active = false WHERE booking_id = $1', [bookingId]);
        return { httpStatus: 200, result: { bookingId, status: 'CANCELLED' } };
      });
    },

    // Schedules and closures are read on every call, so every API server sees a provider's change at once.
    async getSchedules() {
      return new Map((await pool.query('SELECT target, weekly FROM sport.resource_schedules')).rows.map(r => [r.target, r.weekly]));
    },
    async setWeekly(target, weekly) {
      if (weekly === null) await pool.query('DELETE FROM sport.resource_schedules WHERE target = $1', [target]);
      else await pool.query(`INSERT INTO sport.resource_schedules (target, weekly) VALUES ($1, $2)
        ON CONFLICT (target) DO UPDATE SET weekly = EXCLUDED.weekly, updated_at = now()`, [target, weekly]);
    },
    async listClosures() {
      return (await pool.query(`${CLOSURE_SELECT} ORDER BY day, created_at`)).rows.map(toClosure);
    },
    async addClosure(c) {
      return toClosure((await pool.query(`INSERT INTO sport.resource_closures (id, target, day, hours, reason, created_by)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, target, to_char(day, 'YYYY-MM-DD') AS day, hours, reason, created_by, created_at`,
        [newId('CLS', crypto), c.target, c.day, c.hours, c.reason, c.createdBy])).rows[0]);
    },
    async deleteClosure(id) {
      return toClosure((await pool.query(`DELETE FROM sport.resource_closures WHERE id = $1
        RETURNING id, target, to_char(day, 'YYYY-MM-DD') AS day, hours, reason, created_by, created_at`, [id])).rows[0]);
    },

    // Listings are read from the database on every call, so a listing unpublished on one API server is hidden on all of them.
    async listListings() {
      // Catalog order first (the order the athlete app shows), then anything added later.
      return (await pool.query(`${LISTING_SELECT} ORDER BY array_position($1::text[], id) NULLS LAST, created_at, id`, [SEED_LISTINGS.map(l => l.id)])).rows.map(toListing);
    },
    async getListing(id) {
      return toListing((await pool.query(`${LISTING_SELECT} WHERE id = $1`, [id])).rows[0]);
    },
    async setListingPublished(id, published) {
      return toListing((await pool.query(`UPDATE sport.directory_listings SET published = $2 WHERE id = $1
        RETURNING id, kind, name, sport, area, owner_user_id, published, details`, [id, published])).rows[0]);
    },

    // A provider's edit to its own listing. edited_at stops the startup sync from overwriting it.
    async updateListing(id, fields) {
      const price = fields.plans?.Monthly ?? fields.price;
      return toListing((await pool.query(`UPDATE sport.directory_listings SET details = details || $2::jsonb, edited_at = now(),
          price_egp_minor = coalesce($3, price_egp_minor) WHERE id = $1
        RETURNING id, kind, name, sport, area, owner_user_id, published, details`, [id, fields, price === undefined ? null : Math.round(price * 100)])).rows[0]);
    },
    async updateEnquiry(id, f) {
      const { rowCount } = await pool.query(`UPDATE sport.enquiries SET status = coalesce($2, status),
          trial_date = CASE WHEN $3::bool THEN $4::date ELSE trial_date END, provider_note = coalesce($5, provider_note) WHERE id = $1`,
        [id, f.status ?? null, 'trialDate' in f, f.trialDate ?? null, f.providerNote ?? null]);
      return rowCount ? (await this.listEnquiries({ role: 'admin' })).find(e => e.id === id) : null;
    },
    async addEnquiry(e) {
      const { rows } = await pool.query(
        `INSERT INTO sport.enquiries (id, listing_id, target_name, kind, athlete_id, full_name, phone, participant, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, status, created_at`,
        [newId('ENQ', crypto), e.targetId, e.targetName, e.kind, e.athleteId, e.name, e.phone, e.participant, e.notes]);
      return { ...e, id: rows[0].id, status: rows[0].status, trialDate: null, providerNote: null, createdAt: rows[0].created_at.toISOString() };
    },
    async listEnquiries(user) {
      const { rows } = await pool.query(
        `SELECT e.*, to_char(e.trial_date, 'YYYY-MM-DD') AS trial_day FROM sport.enquiries e LEFT JOIN sport.directory_listings l ON l.id = e.listing_id
          WHERE $1 = 'admin' OR l.owner_user_id = $2 ORDER BY e.created_at`, [user.role, user.id]);
      return rows.map(r => ({ id: r.id, athleteId: r.athlete_id, kind: r.kind, targetId: r.listing_id, targetName: r.target_name,
        name: r.full_name, phone: r.phone, participant: r.participant, notes: r.notes, status: r.status, createdAt: r.created_at.toISOString(),
        trialDate: r.trial_day, providerNote: r.provider_note }));
    },
    async listOutbox() {
      return (await pool.query(`SELECT payload FROM sport.outbox_events ORDER BY id`)).rows.map(r => r.payload);
    },

    testing: {
      async expireHold(id) { await pool.query(`UPDATE sport.bookings SET hold_expires_at = now() - interval '1 second' WHERE id = $1`, [id]); },
      async addUser(u) {
        await pool.query(`INSERT INTO sport.users (id, role, full_name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [u.id, u.role, u.name]);
        users.set(u.id, { ...u });
      },
    },
    async close() { clearInterval(sweeper); await pool.end(); },
  };
}
