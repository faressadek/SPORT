// Booking rules shared by the in-memory and PostgreSQL stores.

export const HOLD_TTL_MS = 5 * 60 * 1000; // 5-minute prototype hold

export class HttpError extends Error {
  constructor(status, message) { super(message); this.statusCode = status; }
}

// Validates a hold request against the catalog. Returns the resolved hold, or throws HttpError.
export function validateHold(body, lookup) {
  const { day, hour, pitchId, coachId, resource, customVenue } = body || {};
  // Court first, then coach: the order used for labels and responses in both stores.
  const resourceIds = [...new Set([pitchId, resource, coachId].filter(Boolean).map(String))];
  if (!day || Number.isNaN(Date.parse(day)) || !Number.isInteger(hour) || hour < 0 || hour > 23 || !resourceIds.length) {
    throw new HttpError(400, 'Missing day, hour, or target resource(s)');
  }
  const items = resourceIds.map(id => lookup(id));
  if (items.some(r => !r || !r.published)) throw new HttpError(400, 'Unknown or unpublished resource');
  if ((pitchId && lookup(pitchId).kind !== 'court') || (resource && lookup(resource).kind !== 'court') || (coachId && lookup(coachId).kind !== 'coach')) {
    throw new HttpError(400, 'Resource type does not match the field it was sent in');
  }
  if (items.filter(r => r.kind === 'court').length > 1) throw new HttpError(400, 'Only one court per booking');
  const coach = items.find(r => r.kind === 'coach');
  const court = items.find(r => r.kind === 'court');
  if (coach && coach.fixedVenue && court) {
    throw new HttpError(400, 'This coach trains at a listed venue; a court can be added only for coaches without one.');
  }
  if (coach && court && court.sport !== coach.sport) throw new HttpError(400, 'The added court must be for the coach\'s sport.');
  if (items.some(r => !r.hours.includes(hour))) throw new HttpError(409, 'Not available at this hour.');
  return {
    day: new Date(day).toISOString(),
    hour,
    resourceIds,
    pitch: null, // legacy field: every court is now a club branch pitch, reported in resource
    coach: coachId || null,
    resource: court ? court.id : null,
    label: items.map(r => r.name).join(' + '),
    total: items.reduce((sum, r) => sum + r.price, 0),
    customVenue: coach && !coach.fixedVenue && !court ? String(customVenue || '').slice(0, 120) || null : null,
  };
}

// What a payment capture should do, given the booking's status after expired holds are swept.
//   confirm → HOLD becomes CONFIRMED
//   late    → EXPIRED hold: confirm only if every resource can be re-reserved, else refund
//   refund  → anything else: keep the booking as it is and refund the extra payment
export function capturePlan(status) {
  if (status === 'HOLD') return { action: 'confirm' };
  if (status === 'EXPIRED') return { action: 'late' };
  return { action: 'refund', reason: status === 'CONFIRMED' ? 'DUPLICATE_CAPTURE' : 'CAPTURE_AFTER_' + status };
}

export const captureResults = {
  confirmed: (bookingId, confirmedAt, late = false) => ({ httpStatus: 200, result: { bookingId, status: 'CONFIRMED', confirmedAt, ...(late ? { late: true } : {}) } }),
  lateTaken: bookingId => ({ httpStatus: 409, result: { bookingId, status: 'REFUND_PENDING', refund: 'QUEUED', message: 'Hold expired and the slot was taken; a refund has been queued.' } }),
  refunded: (bookingId, status) => ({ httpStatus: 409, result: { bookingId, status, refund: 'QUEUED', message: 'This booking cannot take another payment; a refund has been queued.' } }),
};

export function refundEvent({ reason, booking, provider, key }) {
  return { type: 'REFUND_REQUESTED', reason, bookingId: booking.id, provider, idempotencyKey: key, amount: booking.total, createdAt: new Date().toISOString() };
}

export const newId = (prefix, crypto) => prefix + '-' + crypto.randomBytes(5).toString('hex').toUpperCase();
