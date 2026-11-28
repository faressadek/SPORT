import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { authenticate, requireRole, canAccessBooking } from './access.mjs';
import { HttpError, validateHold, validateWeekly, validateClosure, openHours, bookingInClosure, cairoDate, priceOf, priceTarget, validatePrice, validateEnquiryUpdate, validateListingEdit } from './rules.mjs';
import { createMemoryStore } from './memory-store.mjs';
import { filterListings, publicListing, SEED_RESOURCES, CLUBS, SPORTS, allMarketResources } from './catalog.mjs';

export { createMemoryStore as createStore };
export { SPORTS, CLUBS } from './catalog.mjs';

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(status === 204 ? undefined : JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new HttpError(413, 'Request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Request body must be valid JSON'); }
}

// Schedule targets: each coach, and each club (all of its courts). Owner = who may change the hours.
function scheduleTargets(store) {
  const coaches = SEED_RESOURCES.filter(r => r.kind === 'coach').map(r => store.lookup(r.id))
    .map(r => ({ target: r.id, kind: 'coach', name: r.name, ownerId: r.ownerId ?? null, defaultHours: r.hours }));
  const clubs = CLUBS.map(c => ({ target: 'club:' + c.id, kind: 'club', name: c.name, ownerId: c.ownerId ?? null,
    defaultHours: store.lookup(`football/${c.id}/0/1`).hours }));
  return [...coaches, ...clubs];
}
const canManage = (user, t) => user.role === 'admin' || (t && t.ownerId === user.id);

// store: createMemoryStore() or await createPgStore(url). Both implement the same async interface.
export function createApp(store = createMemoryStore()) {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const user = authenticate(req.headers.authorization, store.users);

    // Prices come from the server: catalog price, or the provider's own price when set.
    const pricedHold = async hold => {
      const prices = await store.getPrices(), each = Object.fromEntries(hold.resourceIds.map(id => [id, priceOf(store.lookup(id), prices)]));
      return { ...hold, prices: each, total: Object.values(each).reduce((a, b) => a + b, 0) };
    };
    const ownsResource = id => user && (user.role === 'admin' || store.lookup(id)?.ownerId === user.id);
    const ownBooking = async id => {
      const booking = await store.getBooking(id);
      if (!booking) throw new HttpError(404, 'Booking not found');
      if (!canAccessBooking(user, booking)) throw new HttpError(403, 'Forbidden');
      return booking;
    };

    try {
      if (req.method === 'GET' && path === '/api/health') {
        return sendJson(res, 200, { ok: true, service: 'sport-booking-api', store: store.kind, timezone: 'Africa/Cairo' });
      }

      if (req.method === 'GET' && path === '/api/catalog') {
        return sendJson(res, 200, { resources: await store.listCatalog() });
      }

      if (req.method === 'GET' && path === '/api/availability') {
        const day = url.searchParams.get('day');
        const resourceIds = (url.searchParams.get('resources') || '').split(',').filter(Boolean);
        if (!day || Number.isNaN(Date.parse(day))) throw new HttpError(400, 'A valid day is required');
        if (resourceIds.length > 60) throw new HttpError(400, 'At most 60 resources per request');
        const iso = new Date(day).toISOString();
        const [schedules, closures, prices] = await Promise.all([store.getSchedules(), store.listClosures(), store.getPrices()]);
        const resources = {};
        for (const id of resourceIds) {
          const r = store.lookup(id); if (!r || !r.published) continue;
          resources[id] = { openHours: openHours(r, iso, schedules, closures), busyHours: await store.busyHours(iso, [id]), price: priceOf(r, prices) };
        }
        return sendJson(res, 200, { day, busyHours: await store.busyHours(iso, resourceIds), resources });
      }

      if (req.method === 'GET' && path === '/api/bookings') {
        requireRole(user, ['athlete', 'admin']);
        const list = await store.listBookings({ athleteId: user.role === 'admin' ? null : user.id, activeOnly: true });
        return sendJson(res, 200, list);
      }

      // Court only, coach only (fixed or flexible venue), or a flexible coach with an added court.
      if (req.method === 'POST' && path === '/api/holds') {
        requireRole(user, ['athlete']);
        const hold = await pricedHold(validateHold(await readBody(req), store.lookup));
        const [schedules, closures] = await Promise.all([store.getSchedules(), store.listClosures()]);
        if (hold.resourceIds.some(id => !openHours(store.lookup(id), hold.day, schedules, closures).includes(hold.hour))) {
          throw new HttpError(409, 'Not available at this hour.');
        }
        const booking = await store.createHold(hold, user.id);
        return sendJson(res, 201, { bookingId: booking.id, status: booking.status, holdExpiresAt: booking.holdExpiresAt, total: booking.total, label: booking.label });
      }

      // Simulated payment capture. Keys are scoped to the booking, so one caller can never replay another booking's result.
      if (req.method === 'POST' && path === '/api/checkout/capture') {
        requireRole(user, ['athlete', 'admin']);
        const body = await readBody(req);
        await ownBooking(body.bookingId);
        const provider = ['paymob', 'kashier', 'simulator'].includes(body.provider) ? body.provider : 'simulator';
        const { httpStatus, result } = await store.capture({ bookingId: body.bookingId, key: `${body.bookingId}:${body.idempotencyKey || 'default'}`, provider });
        return sendJson(res, httpStatus, result);
      }

      const cancelMatch = path.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
      if (req.method === 'POST' && cancelMatch) {
        requireRole(user, ['athlete', 'admin']);
        const id = decodeURIComponent(cancelMatch[1]);
        await ownBooking(id);
        const { httpStatus, result } = await store.cancel(id);
        return sendJson(res, httpStatus, result);
      }

      // Gyms and academies: public search. Filters: gyms area, facility, q, billing, sort=price; academies sport, area, age, level, q.
      const dirMatch = path.match(/^\/api\/(gyms|academies)$/);
      if (req.method === 'GET' && dirMatch) {
        const kind = dirMatch[1] === 'gyms' ? 'gym' : 'academy';
        const list = filterListings(await store.listListings(), kind, Object.fromEntries(url.searchParams));
        return sendJson(res, 200, { [dirMatch[1]]: list.map(publicListing) });
      }

      // Direct enquiries (no sign-in needed). The listing must exist and be published; its kind and name come from the server.
      if (req.method === 'POST' && path === '/api/enquiries') {
        const body = await readBody(req);
        if (!body.targetId || (!body.fullName && !body.name) || !body.phone || !/^\+?[0-9 ()-]{7,20}$/.test(String(body.phone))) {
          throw new HttpError(400, 'Name, phone, and target listing are required');
        }
        const listing = await store.getListing(String(body.targetId));
        if (!listing || !listing.published) throw new HttpError(404, 'Gym or academy not found');
        const enquiry = await store.addEnquiry({
          athleteId: user?.id || null,
          kind: listing.kind,
          targetId: listing.id,
          targetName: listing.name,
          name: String(body.name || body.fullName).slice(0, 80),
          phone: String(body.phone),
          participant: body.participant ? String(body.participant).slice(0, 80) : null,
          notes: String(body.notes || '').slice(0, 500),
        });
        return sendJson(res, 201, enquiry);
      }

      if (req.method === 'GET' && path === '/api/provider/overview') {
        requireRole(user, ['coach', 'venue_operator', 'gym_operator', 'academy_operator', 'admin']);
        const all = await store.listBookings();
        const bookings = user.role === 'admin' ? all : all.filter(b => b.resourceIds.some(id => store.lookup(id)?.ownerId === user.id));
        const listings = (await store.listListings()).filter(l => user.role === 'admin' || l.ownerId === user.id);
        return sendJson(res, 200, {
          role: user.role,
          bookings,
          listings,
          enquiries: await store.listEnquiries(user),
          outbox: user.role === 'admin' ? await store.listOutbox() : [],
        });
      }

      if (req.method === 'PATCH' && path.startsWith('/api/admin/resources/')) {
        requireRole(user, ['admin']);
        const body = await readBody(req);
        if (typeof body.published !== 'boolean') throw new HttpError(400, 'published must be true or false');
        const resource = await store.setPublished(decodeURIComponent(path.split('/').pop()), body.published);
        if (!resource) throw new HttpError(404, 'Resource not found');
        return sendJson(res, 200, resource);
      }

      // Provider schedules: weekly opening hours and dated closures for the coaches and clubs the caller owns.
      if (req.method === 'GET' && path === '/api/provider/schedule') {
        requireRole(user, ['coach', 'venue_operator', 'gym_operator', 'academy_operator', 'admin']);
        const mine = scheduleTargets(store).filter(t => canManage(user, t));
        const schedules = await store.getSchedules(), names = new Set(mine.map(t => t.target));
        return sendJson(res, 200, {
          targets: mine.map(({ ownerId, ...t }) => ({ ...t, weekly: schedules.get(t.target) ?? null })),
          closures: (await store.listClosures()).filter(c => names.has(c.target)),
        });
      }
      const weeklyMatch = path.match(/^\/api\/provider\/schedule\/([^/]+)$/);
      if (req.method === 'PUT' && weeklyMatch) {
        requireRole(user, ['coach', 'venue_operator', 'admin']);
        const t = scheduleTargets(store).find(x => x.target === decodeURIComponent(weeklyMatch[1]));
        if (!t) throw new HttpError(404, 'Unknown coach or club');
        if (!canManage(user, t)) throw new HttpError(403, 'You can change only your own hours');
        const weekly = validateWeekly((await readBody(req)).weekly);
        await store.setWeekly(t.target, weekly);
        return sendJson(res, 200, { target: t.target, weekly });
      }
      if (req.method === 'POST' && path === '/api/provider/closures') {
        requireRole(user, ['coach', 'venue_operator', 'admin']);
        const body = await readBody(req);
        const t = scheduleTargets(store).find(x => x.target === String(body.target));
        if (!t) throw new HttpError(404, 'Unknown coach or club');
        if (!canManage(user, t)) throw new HttpError(403, 'You can close only your own coach or club');
        const closure = await store.addClosure({ target: t.target, ...validateClosure(body), createdBy: user.id });
        // Existing bookings are kept: cancelling would need refunds. Report them so the provider can contact the athletes.
        const affected = (await store.listBookings({ activeOnly: true })).filter(b => bookingInClosure(b, closure));
        return sendJson(res, 201, { closure, affectedBookings: affected.map(b => ({ id: b.id, day: cairoDate(b.day), hour: b.hour, label: b.label })) });
      }
      const closureMatch = path.match(/^\/api\/provider\/closures\/([^/]+)$/);
      if (req.method === 'DELETE' && closureMatch) {
        requireRole(user, ['coach', 'venue_operator', 'admin']);
        const id = decodeURIComponent(closureMatch[1]);
        const existing = (await store.listClosures()).find(c => c.id === id);
        if (!existing) throw new HttpError(404, 'Closure not found');
        if (!canManage(user, scheduleTargets(store).find(x => x.target === existing.target))) throw new HttpError(403, 'Forbidden');
        await store.deleteClosure(id);
        return sendJson(res, 200, { deleted: id });
      }

      // ---- Provider workspaces -------------------------------------------------------------------
      const PROVIDERS = ['coach', 'venue_operator', 'gym_operator', 'academy_operator', 'admin'];
      if (req.method === 'GET' && path === '/api/provider/me') {
        requireRole(user, PROVIDERS);
        const prices = await store.getPrices();
        const coaches = SEED_RESOURCES.filter(r => r.kind === 'coach' && ownsResource(r.id)).map(r => store.lookup(r.id));
        const clubs = CLUBS.filter(c => user.role === 'admin' || c.ownerId === user.id).map(c => ({ id: c.id, name: c.name, branches: c.branches,
          sports: Object.entries(SPORTS).map(([id, [name, unit]]) => ({ id, name, unit, price: priceOf(store.lookup(`${id}/${c.id}/0/1`), prices), priceTarget: `club:${c.id}:${id}` })) }));
        return sendJson(res, 200, {
          user: { id: user.id, name: user.name, role: user.role },
          coaches: coaches.map(r => ({ id: r.id, name: r.name, sport: r.sport, fixedVenue: r.fixedVenue ?? null, price: priceOf(r, prices), defaultPrice: r.price, hours: r.hours })),
          clubs,
          listings: (await store.listListings()).filter(l => user.role === 'admin' || l.ownerId === user.id),
        });
      }
      // One day for the caller's coaches, or one sport and branch at the caller's club: open hours and bookings per resource.
      if (req.method === 'GET' && path === '/api/provider/calendar') {
        requireRole(user, PROVIDERS);
        const day = url.searchParams.get('day');
        if (!day || Number.isNaN(Date.parse(day))) throw new HttpError(400, 'A valid day is required');
        const iso = new Date(day).toISOString(), club = url.searchParams.get('club'), sport = url.searchParams.get('sport') || 'football', branch = url.searchParams.get('branch') || '0';
        const ids = club ? allMarketResources().filter(r => r.id.startsWith(`${sport}/${club}/${branch}/`)).map(r => r.id)
          : SEED_RESOURCES.filter(r => r.kind === 'coach').map(r => r.id);
        const mine = ids.filter(ownsResource);
        if (club && !mine.length) throw new HttpError(403, 'This is not your club');
        const [schedules, closures, prices, all] = await Promise.all([store.getSchedules(), store.listClosures(), store.getPrices(), store.listBookings({ activeOnly: true })]);
        const dayBookings = all.filter(b => cairoDate(b.day) === cairoDate(iso));
        return sendJson(res, 200, { day: iso, resources: mine.map(id => {
          const r = store.lookup(id);
          return { id, name: r.name, price: priceOf(r, prices), openHours: openHours(r, iso, schedules, closures),
            bookings: dayBookings.filter(b => b.resourceIds.includes(id)).map(b => ({ id: b.id, hour: b.hour, status: b.status, label: b.label,
              source: b.source || 'athlete', note: b.note, checkedIn: Boolean(b.checkedInAt), athlete: b.source === 'athlete' || !b.source ? (store.users.get(b.athleteId)?.name ?? 'Athlete') : null,
              customVenue: b.customVenue, total: b.total })) };
        }) });
      }
      // Walk-in (a player who turned up and paid at the desk) or block (court kept out of use). Confirmed at once.
      if (req.method === 'POST' && path === '/api/provider/blocks') {
        requireRole(user, ['coach', 'venue_operator', 'admin']);
        const body = await readBody(req);
        const source = body.source === 'block' ? 'block' : 'walkin';
        const r = store.lookup(String(body.resource || ''));
        if (!r) throw new HttpError(404, 'Unknown court or coach');
        if (!ownsResource(r.id)) throw new HttpError(403, 'You can record walk-ins only for your own courts');
        const field = r.kind === 'coach' ? 'coachId' : 'resource';
        let hold = await pricedHold(validateHold({ day: body.day, hour: body.hour, [field]: r.id }, store.lookup));
        const [schedules, closures] = await Promise.all([store.getSchedules(), store.listClosures()]);
        if (!openHours(r, hold.day, schedules, closures).includes(hold.hour)) throw new HttpError(409, 'Closed at this hour. Change the opening hours first.');
        if (source === 'block') hold = { ...hold, total: 0, prices: { [r.id]: 0 } };
        const booking = await store.createProviderBooking(hold, user.id, { source, note: String(body.note || '').slice(0, 120) || null });
        return sendJson(res, 201, booking);
      }
      const provBooking = path.match(/^\/api\/provider\/bookings\/([^/]+)\/(checkin|cancel)$/);
      if (req.method === 'POST' && provBooking) {
        requireRole(user, PROVIDERS);
        const b = await store.getBooking(decodeURIComponent(provBooking[1]));
        if (!b || !b.resourceIds.some(ownsResource)) throw new HttpError(404, 'Booking not found');
        if (provBooking[2] === 'checkin') {
          if (b.status !== 'CONFIRMED') throw new HttpError(409, 'Only confirmed bookings can be checked in');
          return sendJson(res, 200, await store.checkIn(b.id));
        }
        // Athletes' paid bookings are cancelled by the athlete or by support (refunds); providers remove only their own walk-ins and blocks.
        if (!['walkin', 'block'].includes(b.source)) throw new HttpError(403, 'Athlete bookings are cancelled by the athlete or SPORT support');
        const { httpStatus, result } = await store.cancel(b.id);
        return sendJson(res, httpStatus, result);
      }
      if (req.method === 'PUT' && path === '/api/provider/prices') {
        requireRole(user, ['coach', 'venue_operator', 'admin']);
        const body = await readBody(req), target = String(body.target || '');
        const sample = target.startsWith('club:') ? store.lookup(`${target.split(':')[2]}/${target.split(':')[1]}/0/1`) : store.lookup(target);
        if (!sample || priceTarget(sample) !== target) throw new HttpError(404, 'Unknown price target');
        if (!ownsResource(sample.id)) throw new HttpError(403, 'You can change only your own prices');
        const price = validatePrice(body.price);
        await store.setPrice(target, price);
        return sendJson(res, 200, { target, price: priceOf(sample, await store.getPrices()) });
      }
      const enqMatch = path.match(/^\/api\/provider\/enquiries\/([^/]+)$/);
      if (req.method === 'PATCH' && enqMatch) {
        requireRole(user, PROVIDERS);
        const id = decodeURIComponent(enqMatch[1]);
        const e = (await store.listEnquiries(user)).find(x => x.id === id); // only enquiries for the caller's listings
        if (!e) throw new HttpError(404, 'Enquiry not found');
        return sendJson(res, 200, await store.updateEnquiry(id, validateEnquiryUpdate(await readBody(req))));
      }
      const listMatch = path.match(/^\/api\/provider\/listings\/([^/]+)$/);
      if (req.method === 'PATCH' && listMatch) {
        requireRole(user, PROVIDERS);
        const l = await store.getListing(decodeURIComponent(listMatch[1]));
        if (!l || (user.role !== 'admin' && l.ownerId !== user.id)) throw new HttpError(404, 'Listing not found');
        return sendJson(res, 200, await store.updateListing(l.id, validateListingEdit(l.kind, await readBody(req))));
      }

      if (req.method === 'PATCH' && path.startsWith('/api/admin/listings/')) {
        requireRole(user, ['admin']);
        const body = await readBody(req);
        if (typeof body.published !== 'boolean') throw new HttpError(400, 'published must be true or false');
        const listing = await store.setListingPublished(decodeURIComponent(path.split('/').pop()), body.published);
        if (!listing) throw new HttpError(404, 'Listing not found');
        return sendJson(res, 200, listing);
      }

      return sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      if (!err.statusCode) console.error(err);
      return sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Internal error' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  let store;
  if (process.env.DATABASE_URL) {
    const { createPgStore } = await import('./pg-store.mjs');
    store = await createPgStore(process.env.DATABASE_URL);
  } else {
    store = createMemoryStore();
  }
  createApp(store).listen(port, host, () => {
    console.log(`SPORT API on http://${host}:${port} · ${store.kind === 'postgres' ? 'PostgreSQL' : 'in-memory (data is lost on restart)'}`);
  });
}
