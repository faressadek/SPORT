import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { authenticate, requireRole, canAccessBooking } from './access.mjs';
import { HttpError, validateHold } from './rules.mjs';
import { createMemoryStore } from './memory-store.mjs';

export { createMemoryStore as createStore };
export { SPORTS, CLUBS } from './catalog.mjs';

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
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

// store: createMemoryStore() or await createPgStore(url). Both implement the same async interface.
export function createApp(store = createMemoryStore()) {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const user = authenticate(req.headers.authorization, store.users);

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
        return sendJson(res, 200, { day, busyHours: await store.busyHours(new Date(day).toISOString(), resourceIds) });
      }

      if (req.method === 'GET' && path === '/api/bookings') {
        requireRole(user, ['athlete', 'admin']);
        const list = await store.listBookings({ athleteId: user.role === 'admin' ? null : user.id, activeOnly: true });
        return sendJson(res, 200, list);
      }

      // Court only, coach only (fixed or flexible venue), or a flexible coach with an added court.
      if (req.method === 'POST' && path === '/api/holds') {
        requireRole(user, ['athlete']);
        const hold = validateHold(await readBody(req), store.lookup);
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

      // Gyms and academies: direct enquiries (no sign-in needed).
      if (req.method === 'POST' && path === '/api/enquiries') {
        const body = await readBody(req);
        if (!body.targetId || (!body.fullName && !body.name) || !body.phone || !/^\+?[0-9 ()-]{7,20}$/.test(String(body.phone))) {
          throw new HttpError(400, 'Name, phone, and target listing are required');
        }
        const enquiry = await store.addEnquiry({
          athleteId: user?.id || null,
          kind: body.kind === 'academy' ? 'academy' : 'gym',
          targetId: String(body.targetId).slice(0, 120),
          targetName: String(body.targetName || body.targetId).slice(0, 120),
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
        return sendJson(res, 200, {
          role: user.role,
          bookings,
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
