// In-memory store: used for tests and for running the demo without a database. Data is lost on restart.
import crypto from 'node:crypto';
import { SEED_USERS, createCatalog } from './catalog.mjs';
import { HOLD_TTL_MS, HttpError, capturePlan, captureResults, refundEvent, newId } from './rules.mjs';

export function createMemoryStore() {
  const catalog = createCatalog();
  const users = new Map(SEED_USERS.map(u => [u.id, { ...u }]));
  const bookings = new Map();
  const payments = new Map();
  const enquiries = [];
  const outbox = [];
  const listingOwners = new Map();

  function sweep(now = Date.now()) {
    for (const b of bookings.values()) if (b.status === 'HOLD' && b.holdExpiresAt <= now) { b.status = 'EXPIRED'; b.active = false; }
  }
  const taken = (resourceIds, day, hour, exceptId) => [...bookings.values()].some(b =>
    b.active && b.id !== exceptId && b.day === day && b.hour === hour && b.resourceIds.some(id => resourceIds.includes(id)));
  const copy = b => b && structuredClone(b);

  return {
    kind: 'memory',
    users,
    lookup: id => catalog.lookup(id),
    listCatalog: async () => catalog.listPublished(),
    async setPublished(id, published) {
      const r = catalog.lookup(id); if (!r) return null; r.published = published; return { ...r };
    },

    async createHold(hold, athleteId) {
      sweep();
      if (taken(hold.resourceIds, hold.day, hold.hour)) throw new HttpError(409, 'One or more selected resources are no longer available at this time.');
      const booking = { id: newId('BKG', crypto), athleteId, status: 'HOLD', active: true, ...hold,
        holdExpiresAt: Date.now() + HOLD_TTL_MS, createdAt: new Date().toISOString(), confirmedAt: null };
      bookings.set(booking.id, booking);
      return copy(booking);
    },
    async getBooking(id) { sweep(); return copy(bookings.get(id)); },
    async listBookings({ athleteId, activeOnly } = {}) {
      sweep();
      return [...bookings.values()].filter(b => (!athleteId || b.athleteId === athleteId) && (!activeOnly || b.active)).map(copy);
    },
    async busyHours(day, resourceIds) {
      sweep();
      return [...new Set([...bookings.values()].filter(b => b.active && b.day === day && b.resourceIds.some(id => resourceIds.includes(id))).map(b => b.hour))];
    },

    async capture({ bookingId, key, provider }) {
      if (payments.has(key)) return payments.get(key);
      sweep();
      const booking = bookings.get(bookingId);
      const plan = capturePlan(booking.status);
      let outcome;
      if (plan.action === 'confirm') {
        booking.status = 'CONFIRMED'; booking.confirmedAt = new Date().toISOString();
        outcome = captureResults.confirmed(bookingId, booking.confirmedAt);
      } else if (plan.action === 'late' && !taken(booking.resourceIds, booking.day, booking.hour, booking.id)) {
        booking.status = 'CONFIRMED'; booking.active = true; booking.confirmedAt = new Date().toISOString();
        outcome = captureResults.confirmed(bookingId, booking.confirmedAt, true);
      } else if (plan.action === 'late') {
        booking.status = 'REFUND_PENDING';
        outbox.push(refundEvent({ reason: 'LATE_CAPTURE_SLOT_TAKEN', booking, provider, key }));
        outcome = captureResults.lateTaken(bookingId);
      } else {
        outbox.push(refundEvent({ reason: plan.reason, booking, provider, key }));
        outcome = captureResults.refunded(bookingId, booking.status);
      }
      payments.set(key, outcome);
      return outcome;
    },

    async cancel(bookingId) {
      sweep();
      const b = bookings.get(bookingId);
      if (b.status === 'CANCELLED') return { httpStatus: 200, result: { bookingId, status: 'CANCELLED' } };
      if (!['HOLD', 'CONFIRMED'].includes(b.status)) return { httpStatus: 409, result: { error: `Cannot cancel a ${b.status} booking` } };
      b.status = 'CANCELLED'; b.active = false;
      return { httpStatus: 200, result: { bookingId, status: 'CANCELLED' } };
    },

    async addEnquiry(e) { const row = { id: newId('ENQ', crypto), status: 'NEW', createdAt: new Date().toISOString(), ...e }; enquiries.push(row); return { ...row }; },
    async listEnquiries(user) {
      return user.role === 'admin' ? enquiries.map(e => ({ ...e })) : enquiries.filter(e => listingOwners.get(e.targetId) === user.id).map(e => ({ ...e }));
    },
    async listOutbox() { return outbox.map(e => ({ ...e })); },

    testing: {
      async expireHold(id) { bookings.get(id).holdExpiresAt = Date.now() - 1000; },
      async addUser(u) { users.set(u.id, { ...u }); },
      async setListingOwner(listingId, ownerId) { listingOwners.set(listingId, ownerId); },
    },
    async close() {},
  };
}
