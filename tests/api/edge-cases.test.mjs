// Edge cases for the booking API: late/duplicate payments, validation, coach add-on rule, enquiry privacy.
import test from 'node:test';
import assert from 'node:assert/strict';

const { createApp, createStore } = await import(new URL("../../apps/api/src/server.mjs", import.meta.url).href);

async function start() {
  const store = createStore();
  const server = createApp(store);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (method, path, token, body) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  return { server, store, call };
}
const A = 'demo-athlete-marwan';
const day = '2026-12-05T12:00:00.000Z';

test('P1 late capture with a NEW key must not double-book a reallocated slot', async () => {
  const { server, store, call } = await start();
  try {
    const b1 = await (await call('POST', '/api/holds', A, { day, hour: 10, pitchId: 'gleem' })).json();
    store.bookings.get(b1.bookingId).holdExpiresAt = Date.now() - 1;
    const b2 = await (await call('POST', '/api/holds', A, { day, hour: 10, pitchId: 'gleem' })).json();
    await call('POST', '/api/checkout/capture', A, { bookingId: b2.bookingId, idempotencyKey: 'b2' });
    const late1 = await call('POST', '/api/checkout/capture', A, { bookingId: b1.bookingId, idempotencyKey: 'late-1' });
    assert.equal(late1.status, 409);
    await call('POST', '/api/checkout/capture', A, { bookingId: b1.bookingId, idempotencyKey: 'late-2' });
    const active = [...store.bookings.values()].filter(b => b.active && b.resourceIds.includes('gleem') && b.hour === 10);
    assert.equal(active.length, 1, 'two active bookings on the same pitch and hour');
    assert.equal(store.outbox.length, 2, 'each extra capture records one refund');
  } finally { server.close(); }
});

test('P2 capturing a cancelled booking must not revive it', async () => {
  const { server, store, call } = await start();
  try {
    const b = await (await call('POST', '/api/holds', A, { day, hour: 11, pitchId: 'smouha' })).json();
    await call('POST', `/api/bookings/${b.bookingId}/cancel`, A);
    await call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'c1' });
    assert.notEqual(store.bookings.get(b.bookingId).status, 'CONFIRMED');
  } finally { server.close(); }
});

test('P3 a second capture of a confirmed booking with a new key records a refund', async () => {
  const { server, store, call } = await start();
  try {
    const b = await (await call('POST', '/api/holds', A, { day, hour: 9, pitchId: 'montaza' })).json();
    await call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'k1' });
    await call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'k2' });
    assert.equal(store.outbox.length, 1, 'duplicate charge left without a refund');
  } finally { server.close(); }
});

test('P4 unknown, unpublished, or off-hours resources are rejected', async () => {
  const { server, store, call } = await start();
  try {
    assert.equal((await call('POST', '/api/holds', A, { day, hour: 10, pitchId: 'no-such-pitch' })).status, 400, 'unknown pitch priced at 500');
    assert.equal((await call('POST', '/api/holds', A, { day, hour: 3, pitchId: 'smouha' })).status, 409, 'outside listed hours');
    store.resources.get('gleem').published = false;
    assert.equal((await call('POST', '/api/holds', A, { day, hour: 10, pitchId: 'gleem' })).status, 400, 'unpublished pitch');
  } finally { server.close(); }
});

test('P5 a court can be added only to a coach with no listed venue', async () => {
  const { server, call } = await start();
  try {
    const r = await call('POST', '/api/holds', A, { day, hour: 9, coachId: 'nour', pitchId: 'smouha' });
    assert.equal(r.status, 400, 'fixed-venue coach booked with an added court');
  } finally { server.close(); }
});

test('P6 providers see only enquiries for their own listings', async () => {
  const { server, call } = await start();
  try {
    await call('POST', '/api/enquiries', null, { kind: 'gym', targetId: 'some-gym', name: 'Parent', phone: '+201111111111' });
    const ov = await (await call('GET', '/api/provider/overview', 'coach-fares')).json();
    assert.equal(ov.enquiries.length, 0, 'coach can read other businesses’ enquiries and phone numbers');
  } finally { server.close(); }
});

test('P7 idempotency key cannot return another athlete’s payment', async () => {
  const { server, store, call } = await start();
  try {
    store.users.set('athlete-2', { id: 'athlete-2', role: 'athlete', name: 'Other' });
    const b = await (await call('POST', '/api/holds', A, { day, hour: 18, pitchId: 'smouha' })).json();
    await call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'shared' });
    const r = await call('POST', '/api/checkout/capture', 'athlete-2', { bookingId: b.bookingId, idempotencyKey: 'shared' });
    assert.equal(r.status, 403);
  } finally { server.close(); }
});

test('P8 malformed JSON returns 400, not 500', async () => {
  const { server, call } = await start();
  try {
    assert.equal((await call('POST', '/api/holds', A, '{bad')).status, 400);
  } finally { server.close(); }
});

test('P9 simultaneous holds on a shared coach: exactly one wins, loser’s court stays free', async () => {
  const { server, store, call } = await start();
  try {
    const rs = await Promise.all([
      call('POST', '/api/holds', A, { day, hour: 10, coachId: 'omar', pitchId: 'smouha' }),
      call('POST', '/api/holds', A, { day, hour: 10, coachId: 'omar', pitchId: 'gleem' }),
    ]);
    const codes = rs.map(r => r.status).sort();
    assert.deepEqual(codes, [201, 409]);
    const loserCourt = rs[0].status === 409 ? 'smouha' : 'gleem';
    assert.equal((await call('POST', '/api/holds', A, { day, hour: 10, pitchId: loserCourt })).status, 201);
  } finally { server.close(); }
});
