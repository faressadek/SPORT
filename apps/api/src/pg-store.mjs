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
  SELECT b.id, b.athlete_id, b.status, b.custom_venue, b.total_egp_minor, b.hold_expires_at, b.confirmed_at, b.created_at,
         to_char((lower(b.slot_range) AT TIME ZONE '${TZ}')::date, 'YYYY-MM-DD') AS local_date,
         extract(hour FROM lower(b.slot_range) AT TIME ZONE '${TZ}')::int AS hour,
         array_agg(a.resource_id ORDER BY a.id) AS resource_ids,
         bool_or(a.active) AS active
    FROM sport.bookings b JOIN sport.booking_allocations a ON a.booking_id = b.id`;

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
             price_egp_minor = EXCLUDED.price_egp_minor, billing_period = EXCLUDED.billing_period,
             owner_user_id = EXCLUDED.owner_user_id, details = EXCLUDED.details`,
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
            [id, rid, Math.round(catalog.lookup(rid).price * 100)]);
          return fetchBooking(c, id);
        });
      } catch (e) {
        if (e.code === OVERLAP) throw new HttpError(409, 'One or more selected resources are no longer available at this time.');
        throw e;
      }
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

    async addEnquiry(e) {
      const { rows } = await pool.query(
        `INSERT INTO sport.enquiries (id, listing_id, target_name, kind, athlete_id, full_name, phone, participant, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, status, created_at`,
        [newId('ENQ', crypto), e.targetId, e.targetName, e.kind, e.athleteId, e.name, e.phone, e.participant, e.notes]);
      return { ...e, id: rows[0].id, status: rows[0].status, createdAt: rows[0].created_at.toISOString() };
    },
    async listEnquiries(user) {
      const { rows } = await pool.query(
        `SELECT e.* FROM sport.enquiries e LEFT JOIN sport.directory_listings l ON l.id = e.listing_id
          WHERE $1 = 'admin' OR l.owner_user_id = $2 ORDER BY e.created_at`, [user.role, user.id]);
      return rows.map(r => ({ id: r.id, athleteId: r.athlete_id, kind: r.kind, targetId: r.listing_id, targetName: r.target_name,
        name: r.full_name, phone: r.phone, participant: r.participant, notes: r.notes, status: r.status, createdAt: r.created_at.toISOString() }));
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
