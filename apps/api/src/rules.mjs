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

// ---- Provider schedules -------------------------------------------------------------------------
// A schedule target is a coach (its resource id) or a whole club ("club:<id>", every court of every sport there).
// weekly: { "0": [hours], ..., "6": [hours] } with 0 = Sunday, Cairo local hours. A missing weekday means closed that day.
// No weekly schedule = the resource's catalog hours every day. Closures remove hours on one Cairo date (hours null = all day).

export const clubOf = resourceId => (String(resourceId).includes('/') ? String(resourceId).split('/')[1] : null);
export const targetsFor = resourceId => [String(resourceId), ...(clubOf(resourceId) ? ['club:' + clubOf(resourceId)] : [])];

const isHour = h => Number.isInteger(h) && h >= 0 && h <= 23;
const cleanHours = (list, what) => {
  if (!Array.isArray(list) || !list.every(isHour)) throw new HttpError(400, `${what} must be a list of whole hours from 0 to 23`);
  return [...new Set(list)].sort((a, b) => a - b);
};
export function validateWeekly(weekly) {
  if (weekly === null) return null; // back to catalog hours
  if (typeof weekly !== 'object' || Array.isArray(weekly)) throw new HttpError(400, 'weekly must be an object keyed by weekday 0-6, or null');
  const out = {};
  for (const [k, v] of Object.entries(weekly)) {
    if (!/^[0-6]$/.test(k)) throw new HttpError(400, 'Weekdays are 0 (Sunday) to 6 (Saturday)');
    out[k] = cleanHours(v, `Hours for weekday ${k}`);
  }
  return out;
}
export function validateClosure(body) {
  const { day, hours = null, reason = '' } = body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day)) || Number.isNaN(Date.parse(day))) throw new HttpError(400, 'day must be a date like 2026-12-05');
  return { day: String(day), hours: hours === null ? null : cleanHours(hours, 'Closed hours'), reason: String(reason).slice(0, 120) };
}
// The Cairo date of a booking day (the app sends noon UTC on the Cairo date).
export const cairoDate = day => new Date(day).toISOString().slice(0, 10);

// Open hours for one resource on one Cairo date. schedules: Map target -> weekly; closures: [{target, day, hours}].
export function openHours(resource, day, schedules, closures) {
  const date = cairoDate(day), weekday = String(new Date(date + 'T12:00:00Z').getUTCDay());
  const targets = targetsFor(resource.id);
  const weekly = targets.map(t => schedules.get(t)).find(Boolean);
  let hours = weekly ? (weekly[weekday] || []) : resource.hours;
  for (const c of closures) {
    if (c.day !== date || !targets.includes(c.target)) continue;
    hours = c.hours === null ? [] : hours.filter(h => !c.hours.includes(h));
  }
  return hours;
}
// True when a booking falls inside a closure.
export const bookingInClosure = (b, c) => cairoDate(b.day) === c.day && (c.hours === null || c.hours.includes(b.hour))
  && b.resourceIds.some(id => targetsFor(id).includes(c.target));

// ---- Provider workspaces ------------------------------------------------------------------------
// Price overrides: a coach (its id) or one sport at one club ("club:<id>:<sport>"); the club's branch steps still apply.
export const priceTarget = r => (r.kind === 'coach' ? r.id : `club:${clubOf(r.id)}:${r.sport}`);
export function priceOf(r, prices) {
  const base = prices.get(priceTarget(r));
  if (base === undefined) return r.price;
  return r.kind === 'coach' ? base : base + Number(String(r.id).split('/')[2]) * 25;
}
export function validatePrice(price) {
  if (price === null) return null;
  if (!Number.isInteger(price) || price < 50 || price > 20000) throw new HttpError(400, 'Price must be a whole number of EGP from 50 to 20,000');
  return price;
}

export const ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'TRIAL', 'ENROLLED', 'CLOSED'];
export function validateEnquiryUpdate(body) {
  const out = {};
  if (body.status !== undefined) {
    if (!ENQUIRY_STATUSES.includes(body.status)) throw new HttpError(400, 'Unknown enquiry status');
    out.status = body.status;
  }
  if (body.trialDate !== undefined) {
    if (body.trialDate !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.trialDate)) || Number.isNaN(Date.parse(body.trialDate)))) throw new HttpError(400, 'trialDate must be a date like 2026-12-05');
    out.trialDate = body.trialDate;
  }
  if (body.note !== undefined) out.providerNote = String(body.note).slice(0, 300);
  if (!Object.keys(out).length) throw new HttpError(400, 'Nothing to update');
  return out;
}

// Fields a gym or academy may edit on its own listing.
const text = (v, max, what) => { if (typeof v !== 'string' || !v.trim()) throw new HttpError(400, `${what} is required`); return v.trim().slice(0, max); };
const list = (v, maxItems, what) => {
  if (!Array.isArray(v) || !v.length || v.length > maxItems || !v.every(x => typeof x === 'string' && x.trim())) throw new HttpError(400, `${what} must be a list of 1 to ${maxItems} items`);
  return v.map(x => x.trim().slice(0, 40));
};
const egp = (v, what) => { if (!Number.isInteger(v) || v < 50 || v > 200000) throw new HttpError(400, `${what} must be a whole number of EGP`); return v; };
export function validateListingEdit(kind, body) {
  const out = {};
  const fields = kind === 'gym'
    ? { plans: v => { if (!v || typeof v !== 'object') throw new HttpError(400, 'plans must have Monthly, Quarterly and Annual');
          return { Monthly: egp(v.Monthly, 'Monthly price'), Quarterly: egp(v.Quarterly, 'Quarterly price'), Annual: egp(v.Annual, 'Annual price') }; },
        facilities: v => list(v, 10, 'Facilities'), hours: v => text(v, 40, 'Opening hours'), trial: v => text(v, 80, 'Trial offer'), note: v => text(v, 200, 'Description') }
    : { ages: v => list(v, 6, 'Age groups'), levels: v => list(v, 5, 'Levels'), schedule: v => text(v, 120, 'Schedule'),
        price: v => egp(v, 'Price'), billing: v => text(v, 60, 'Billing period'), coachLead: v => text(v, 100, 'Coaches'), summary: v => text(v, 240, 'Description') };
  for (const [k, fn] of Object.entries(fields)) if (body[k] !== undefined) out[k] = fn(body[k]);
  if (!Object.keys(out).length) throw new HttpError(400, 'Nothing to update');
  return out;
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
