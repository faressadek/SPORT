import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { authenticate, requireRole, canAccessBooking } from './access.mjs';

const HOLD_TTL_MS = 5 * 60 * 1000; // 5-minute prototype hold

// Facility marketplace pitches/courts, mirrored from the athlete app so the API prices them the same way.
// Resource key: <sport>/<clubId>/<branchIndex>/<unitNumber>
export const SPORTS = { padel: ['Padel', 'Court', 520], football: ['Football', 'Pitch', 500], padbol: ['Padbol', 'Court', 400], pickleball: ['Pickleball', 'Court', 320], tennis: ['Tennis', 'Court', 450], basketball: ['Basketball', 'Court', 600], squash: ['Squash', 'Court', 300], handball: ['Handball', 'Court', 350], volleyball: ['Volleyball', 'Court', 350] };
export const CLUBS = [
  { id: 'coastal', name: 'Coastal Sports Club', branches: [['Gleem', 3], ['Smouha', 2]], ownerId: 'venue-coastal' },
  { id: 'east', name: 'Eastside Sports Centre', branches: [['Montaza', 2], ['Sidi Bishr', 3]], ownerId: null },
  { id: 'city', name: 'City Sports Grounds', branches: [['Sporting', 3], ['Roushdy', 2]], ownerId: null },
];
const MARKET_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
function marketResource(key) {
  const [sportId, clubId, b, n] = String(key).split('/');
  const sport = SPORTS[sportId], ci = CLUBS.findIndex(c => c.id === clubId), branch = CLUBS[ci]?.branches[Number(b)];
  if (!sport || !branch || !/^\d+$/.test(b ?? '') || !/^\d+$/.test(n ?? '') || Number(n) < 1 || Number(n) > branch[1]) return null;
  return { id: key, kind: 'court', sport: sportId, name: `${CLUBS[ci].name} · ${branch[0]} · ${sport[1]} ${n}`, area: branch[0],
    price: sport[2] + ci * 50 + Number(b) * 25, hours: MARKET_HOURS, ownerId: CLUBS[ci].ownerId, published: true };
}
class HttpError extends Error { constructor(status, message) { super(message); this.statusCode = status; } }

export function createStore() {
  const users = new Map([
    ['demo-athlete-marwan', { id: 'demo-athlete-marwan', role: 'athlete', name: 'Marwan' }],
    ['coach-fares', { id: 'coach-fares', role: 'coach', name: 'Coach Fares Sadek' }],
    ['venue-coastal', { id: 'venue-coastal', role: 'venue_operator', name: 'Coastal Sports Club' }],
    ['admin-sport', { id: 'admin-sport', role: 'admin', name: 'SPORT Ops Admin' }],
  ]);

  const resources = new Map([
    ['smouha', { id: 'smouha', kind: 'court', sport: 'football', name: 'North Pitch', area: 'Smouha', price: 500, hours: [9, 10, 11, 18], ownerId: 'venue-coastal', published: true }],
    ['gleem', { id: 'gleem', kind: 'court', sport: 'football', name: 'Seafront Pitch', area: 'Gleem', price: 700, hours: [10, 11, 16, 17], ownerId: 'venue-coastal', published: true }],
    ['montaza', { id: 'montaza', kind: 'court', sport: 'football', name: 'East Ground', area: 'Montaza', price: 1100, hours: [9, 12, 15, 20], ownerId: 'venue-coastal', published: true }],
    ['padel-coach', { id: 'padel-coach', kind: 'coach', sport: 'padel', name: 'Karim El-Masry (Padel)', area: 'Smouha', fixedVenue: 'Smouha Padel Club', price: 450, hours: [9, 11, 17, 19], ownerId: 'coach-fares', published: true }],
    ['nour', { id: 'nour', kind: 'coach', sport: 'football', name: 'Nour Amin', area: 'Smouha', fixedVenue: 'Smouha training ground', price: 350, hours: [9, 11, 16, 18], ownerId: 'coach-fares', published: true }],
    ['omar', { id: 'omar', kind: 'coach', sport: 'football', name: 'Omar Adel', area: 'Alexandria', fixedVenue: null, price: 400, hours: [10, 11, 17, 18], ownerId: 'coach-fares', published: true }],
  ]);

  const bookings = new Map();
  const paymentsByKey = new Map();
  const enquiries = [];
  const outbox = [];

  function sweepExpiredHolds(now = Date.now()) {
    for (const booking of bookings.values()) {
      if (booking.status === 'HOLD' && booking.holdExpiresAt <= now) {
        booking.status = 'EXPIRED';
        booking.active = false;
      }
    }
  }

  function hasOverlap(resourceIds, day, hour, now = Date.now()) {
    sweepExpiredHolds(now);
    for (const b of bookings.values()) {
      if (!b.active) continue;
      if (b.day === day && b.hour === hour) {
        for (const rId of resourceIds) {
          if (b.resourceIds.includes(rId)) return true;
        }
      }
    }
    return false;
  }

  // Gym and academy listings owned by providers (enquiries are visible only to the listing owner and admins).
  const listingOwners = new Map();
  const lookup = id => resources.get(id) || marketResource(id);
  return { users, resources, bookings, paymentsByKey, enquiries, outbox, listingOwners, lookup, sweepExpiredHolds, hasOverlap };
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Request body must be valid JSON'); }
}

export function createApp(store = createStore()) {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    const user = authenticate(req.headers.authorization, store.users);

    try {
      // Health probe
      if (req.method === 'GET' && path === '/api/health') {
        return sendJson(res, 200, { ok: true, service: 'sport-booking-api', timezone: 'Africa/Cairo' });
      }

      // Public catalog
      if (req.method === 'GET' && path === '/api/catalog') {
        const items = [...store.resources.values()].filter(r => r.published);
        return sendJson(res, 200, { resources: items });
      }

      // Check availability
      if (req.method === 'GET' && path === '/api/availability') {
        const day = url.searchParams.get('day');
        const resourceIds = (url.searchParams.get('resources') || '').split(',').filter(Boolean);
        store.sweepExpiredHolds();
        const busyHours = new Set();
        for (const b of store.bookings.values()) {
          if (b.active && b.day === day && resourceIds.some(id => b.resourceIds.includes(id))) {
            busyHours.add(b.hour);
          }
        }
        return sendJson(res, 200, { day, busyHours: [...busyHours] });
      }

      // List Athlete Bookings
      if (req.method === 'GET' && path === '/api/bookings') {
        requireRole(user, ['athlete', 'admin']);
        store.sweepExpiredHolds();
        const list = [...store.bookings.values()].filter(b => canAccessBooking(user, b) && b.active);
        return sendJson(res, 200, list);
      }

      // Create Atomic Hold (Single court, Fixed Coach, OR Flexible Coach + Added Court)
      if (req.method === 'POST' && path === '/api/holds') {
        requireRole(user, ['athlete']);
        const body = await readBody(req);
        const { day, hour, pitchId, coachId, resource, customVenue } = body;
        const resourceIds = [...new Set([pitchId, coachId, resource].filter(Boolean))];
        if (!day || Number.isNaN(Date.parse(day)) || !Number.isInteger(hour) || !resourceIds.length) {
          return sendJson(res, 400, { error: 'Missing day, hour, or target resource(s)' });
        }
        const items = resourceIds.map(id => store.lookup(id));
        if (items.some(r => !r || !r.published)) return sendJson(res, 400, { error: 'Unknown or unpublished resource' });
        if ((pitchId && store.lookup(pitchId).kind !== 'court') || (resource && store.lookup(resource).kind !== 'court') || (coachId && store.lookup(coachId).kind !== 'coach')) {
          return sendJson(res, 400, { error: 'Resource type does not match the field it was sent in' });
        }
        if (items.filter(r => r.kind === 'court').length > 1) return sendJson(res, 400, { error: 'Only one court per booking' });
        const coach = items.find(r => r.kind === 'coach');
        if (coach && coach.fixedVenue && items.some(r => r.kind === 'court')) {
          return sendJson(res, 400, { error: 'This coach trains at a listed venue; a court can be added only for coaches without one.' });
        }
        if (items.some(r => !r.hours.includes(hour))) {
          return sendJson(res, 409, { error: 'Not available at this hour.' });
        }

        // Atomic overlap check across all requested resources
        if (store.hasOverlap(resourceIds, day, hour)) {
          return sendJson(res, 409, { error: 'One or more selected resources are no longer available at this time.' });
        }

        const total = items.reduce((sum, r) => sum + r.price, 0);
        const label = items.map(r => r.name).join(' + ');
        const bookingId = 'BKG-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        const booking = {
          id: bookingId,
          athleteId: user.id,
          status: 'HOLD',
          active: true,
          day,
          hour,
          pitch: pitchId || null,
          coach: coachId || null,
          resource: resource || null,
          resourceIds,
          label,
          customVenue: (coach && !coach.fixedVenue && !items.some(r => r.kind === 'court')) ? String(customVenue || '').slice(0, 120) || null : null,
          total,
          holdExpiresAt: Date.now() + HOLD_TTL_MS,
          createdAt: new Date().toISOString(),
        };
        store.bookings.set(bookingId, booking);
        return sendJson(res, 201, { bookingId, status: booking.status, holdExpiresAt: booking.holdExpiresAt, total, label });
      }

      // Idempotent Payment Capture (Paymob / Kashier / Simulator)
      if (req.method === 'POST' && path === '/api/checkout/capture') {
        requireRole(user, ['athlete', 'admin']);
        const body = await readBody(req);
        const { bookingId, provider = 'simulator' } = body;
        const booking = store.bookings.get(bookingId);
        if (!booking) return sendJson(res, 404, { error: 'Booking not found' });
        if (!canAccessBooking(user, booking)) return sendJson(res, 403, { error: 'Forbidden' });
        // Keys are scoped to the booking so one caller can never replay another booking's result.
        const key = `${bookingId}:${body.idempotencyKey || 'default'}`;
        if (store.paymentsByKey.has(key)) return sendJson(res, store.paymentsByKey.get(key).httpStatus, store.paymentsByKey.get(key).result);

        store.sweepExpiredHolds();
        const remember = (httpStatus, result) => { store.paymentsByKey.set(key, { httpStatus, result }); return sendJson(res, httpStatus, result); };
        const refund = (reason, message) => {
          store.outbox.push({ type: 'REFUND_REQUESTED', reason, bookingId, provider, idempotencyKey: key, amount: booking.total, createdAt: new Date().toISOString() });
          return remember(409, { bookingId, status: booking.status, refund: 'QUEUED', message });
        };

        if (booking.status === 'HOLD') {
          booking.status = 'CONFIRMED';
          booking.confirmedAt = new Date().toISOString();
          return remember(200, { bookingId, status: 'CONFIRMED', confirmedAt: booking.confirmedAt });
        }
        if (booking.status === 'EXPIRED') {
          // Late payment: confirm only if every resource is still free; otherwise keep the newer booking and refund.
          if (store.hasOverlap(booking.resourceIds, booking.day, booking.hour)) {
            booking.status = 'REFUND_PENDING';
            return refund('LATE_CAPTURE_SLOT_TAKEN', 'Hold expired and the slot was taken; a refund has been queued.');
          }
          booking.status = 'CONFIRMED'; booking.active = true; booking.confirmedAt = new Date().toISOString();
          return remember(200, { bookingId, status: 'CONFIRMED', confirmedAt: booking.confirmedAt, late: true });
        }
        // CONFIRMED (duplicate charge), CANCELLED or REFUND_PENDING: never change the booking, refund the extra payment.
        return refund(booking.status === 'CONFIRMED' ? 'DUPLICATE_CAPTURE' : 'CAPTURE_AFTER_' + booking.status,
          'This booking cannot take another payment; a refund has been queued.');
      }

      // Cancel Booking
      const cancelMatch = path.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
      if (req.method === 'POST' && cancelMatch) {
        requireRole(user, ['athlete', 'admin']);
        const booking = store.bookings.get(decodeURIComponent(cancelMatch[1]));
        if (!booking) return sendJson(res, 404, { error: 'Booking not found' });
        if (!canAccessBooking(user, booking)) return sendJson(res, 403, { error: 'Forbidden' });
        if (booking.status === 'CANCELLED') return sendJson(res, 200, { bookingId: booking.id, status: 'CANCELLED' });
        if (!['HOLD', 'CONFIRMED'].includes(booking.status)) return sendJson(res, 409, { error: `Cannot cancel a ${booking.status} booking` });
        booking.status = 'CANCELLED';
        booking.active = false;
        return sendJson(res, 200, { bookingId: booking.id, status: 'CANCELLED' });
      }

      // Gyms & Academies Direct Enquiries
      if (req.method === 'POST' && path === '/api/enquiries') {
        const body = await readBody(req);
        if (!body.targetId || (!body.fullName && !body.name) || !body.phone || !/^\+?[0-9 ()-]{7,20}$/.test(String(body.phone))) {
          return sendJson(res, 400, { error: 'Name, phone, and target listing are required' });
        }
        const enquiry = {
          id: 'ENQ-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
          athleteId: user?.id || null,
          kind: body.kind === 'academy' ? 'academy' : 'gym',
          targetId: body.targetId,
          targetName: String(body.targetName || body.targetId).slice(0, 120),
          name: String(body.name || body.fullName).slice(0, 80),
          phone: String(body.phone),
          participant: body.participant ? String(body.participant).slice(0, 80) : null,
          notes: String(body.notes || '').slice(0, 500),
          status: 'NEW',
          createdAt: new Date().toISOString(),
        };
        store.enquiries.push(enquiry);
        return sendJson(res, 201, enquiry);
      }

      // Provider & Admin Management Endpoints
      if (req.method === 'GET' && path === '/api/provider/overview') {
        requireRole(user, ['coach', 'venue_operator', 'gym_operator', 'academy_operator', 'admin']);
        store.sweepExpiredHolds();
        const allBookings = [...store.bookings.values()];
        const visibleBookings = user.role === 'admin'
          ? allBookings
          : allBookings.filter(b => b.resourceIds.some(id => store.lookup(id)?.ownerId === user.id));
        return sendJson(res, 200, {
          role: user.role,
          bookings: visibleBookings,
          enquiries: user.role === 'admin' ? store.enquiries : store.enquiries.filter(e => store.listingOwners.get(e.targetId) === user.id),
          outbox: user.role === 'admin' ? store.outbox : [],
        });
      }

      if (req.method === 'PATCH' && path.startsWith('/api/admin/resources/')) {
        requireRole(user, ['admin']);
        const resId = decodeURIComponent(path.split('/').pop());
        const resource = store.resources.get(resId);
        if (!resource) return sendJson(res, 404, { error: 'Resource not found' });
        const body = await readBody(req);
        if (typeof body.published === 'boolean') resource.published = body.published;
        return sendJson(res, 200, resource);
      }

      return sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = createApp();
  server.listen(port, host, () => {
    console.log(`SPORT API listening on http://${host}:${port}`);
  });
}
