// Edge cases for the booking API: late/duplicate payments, validation, coach add-on rule, enquiry privacy, races.
import assert from 'node:assert/strict';
import { storeTest } from './harness.mjs';

const A = 'demo-athlete-marwan';
const day = '2026-12-05T12:00:00.000Z';
const active = async (store, resource, hour) =>
  (await store.listBookings({ activeOnly: true })).filter(b => b.resourceIds.includes(resource) && b.hour === hour);

storeTest('P1 late capture with a NEW key must not double-book a reallocated slot', async ({ call, store }) => {
  const b1 = await (await call('POST', '/api/holds', A, { day, hour: 10, pitchId: 'gleem' })).json();
  await store.testing.expireHold(b1.bookingId);
  const b2 = await (await call('POST', '/api/holds', A, { day, hour: 10, pitchId: 'gleem' })).json();
  await call('POST', '/api/checkout/capture', A, { bookingId: b2.bookingId, idempotencyKey: 'b2' });
  assert.equal((await call('POST', '/api/checkout/capture', A, { bookingId: b1.bookingId, idempotencyKey: 'late-1' })).status, 409);
  await call('POST', '/api/checkout/capture', A, { bookingId: b1.bookingId, idempotencyKey: 'late-2' });
  assert.equal((await active(store, 'gleem', 10)).length, 1, 'two active bookings on the same pitch and hour');
  assert.equal((await store.listOutbox()).length, 2, 'each extra capture records one refund');
});

storeTest('P2 capturing a cancelled booking must not revive it', async ({ call, store }) => {
  const b = await (await call('POST', '/api/holds', A, { day, hour: 11, pitchId: 'smouha' })).json();
  await call('POST', `/api/bookings/${b.bookingId}/cancel`, A);
  await call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'c1' });
  assert.equal((await store.getBooking(b.bookingId)).status, 'CANCELLED');
  assert.equal((await store.listOutbox()).length, 1);
});

storeTest('P3 a second capture of a confirmed booking with a new key records a refund', async ({ call, store }) => {
  const b = await (await call('POST', '/api/holds', A, { day, hour: 9, pitchId: 'montaza' })).json();
  await call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'k1' });
  await call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'k2' });
  assert.equal((await store.listOutbox()).length, 1, 'duplicate charge left without a refund');
});

storeTest('P4 unknown, unpublished, or off-hours resources are rejected', async ({ call, store }) => {
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 10, pitchId: 'no-such-pitch' })).status, 400);
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 3, pitchId: 'smouha' })).status, 409);
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 10, resource: 'football/coastal/9/1' })).status, 400);
  await store.setPublished('gleem', false);
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 10, pitchId: 'gleem' })).status, 400);
});

storeTest('P5 a court can be added only to a coach with no listed venue', async ({ call }) => {
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 9, coachId: 'nour', pitchId: 'smouha' })).status, 400);
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 10, coachId: 'omar', pitchId: 'smouha' })).status, 201);
});

storeTest('P6 providers see only enquiries for their own listings', async ({ call, store }) => {
  await call('POST', '/api/enquiries', null, { kind: 'gym', targetId: 'some-gym', name: 'Parent', phone: '+201111111111' });
  await store.testing.setListingOwner('kick-smash-gym', 'coach-fares');
  await call('POST', '/api/enquiries', null, { kind: 'gym', targetId: 'kick-smash-gym', name: 'Mona', phone: '+201222222222' });
  const coach = await (await call('GET', '/api/provider/overview', 'coach-fares')).json();
  assert.deepEqual(coach.enquiries.map(e => e.name), ['Mona']);
  const admin = await (await call('GET', '/api/provider/overview', 'admin-sport')).json();
  assert.equal(admin.enquiries.length, 2);
});

storeTest('P7 idempotency key cannot return another athlete’s payment', async ({ call, store }) => {
  await store.testing.addUser({ id: 'athlete-2', role: 'athlete', name: 'Other' });
  const b = await (await call('POST', '/api/holds', A, { day, hour: 18, pitchId: 'smouha' })).json();
  await call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'shared' });
  assert.equal((await call('POST', '/api/checkout/capture', 'athlete-2', { bookingId: b.bookingId, idempotencyKey: 'shared' })).status, 403);
});

storeTest('P8 malformed JSON returns 400, not 500', async ({ call }) => {
  assert.equal((await call('POST', '/api/holds', A, '{bad')).status, 400);
});

storeTest('P9 simultaneous holds on a shared coach: exactly one wins, loser’s court stays free', async ({ call }) => {
  const rs = await Promise.all([
    call('POST', '/api/holds', A, { day, hour: 10, coachId: 'omar', pitchId: 'smouha' }),
    call('POST', '/api/holds', A, { day, hour: 10, coachId: 'omar', pitchId: 'gleem' }),
  ]);
  assert.deepEqual(rs.map(r => r.status).sort(), [201, 409]);
  const loserCourt = rs[0].status === 409 ? 'smouha' : 'gleem';
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 10, pitchId: loserCourt })).status, 201);
});

storeTest('P10 twelve simultaneous requests for one facility court: exactly one wins', async ({ call, store }) => {
  const rs = await Promise.all(Array.from({ length: 12 }, () => call('POST', '/api/holds', A, { day, hour: 20, resource: 'football/city/0/2' })));
  assert.equal(rs.filter(r => r.status === 201).length, 1);
  assert.equal(rs.filter(r => r.status === 409).length, 11);
  assert.equal((await active(store, 'football/city/0/2', 20)).length, 1);
});

storeTest('P11 simultaneous duplicate captures with the same key confirm once, no refund', async ({ call, store }) => {
  const b = await (await call('POST', '/api/holds', A, { day, hour: 12, pitchId: 'montaza' })).json();
  const rs = await Promise.all(Array.from({ length: 5 }, () => call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'same' })));
  assert.deepEqual(rs.map(r => r.status), [200, 200, 200, 200, 200]);
  assert.equal((await store.listOutbox()).length, 0);
});

storeTest('P12 Cairo hours map to the right instants and adjacent hours do not clash', async ({ call, store }) => {
  const a = await (await call('POST', '/api/holds', A, { day, hour: 17, coachId: 'omar' })).json();
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 18, coachId: 'omar' })).status, 201);
  const b = await store.getBooking(a.bookingId);
  assert.deepEqual([b.day, b.hour], [day, 17]);
});

storeTest('P13 two API servers on one database: 40 mixed requests for one coach-hour, exactly one wins, no errors', async ({ url, base }) => {
  const { createPgStore } = await import('../../apps/api/src/pg-store.mjs');
  const { createApp } = await import('../../apps/api/src/server.mjs');
  const second = await createPgStore(url); // a second server with its own connection pool
  const server2 = createApp(second);
  await new Promise(r => server2.listen(0, '127.0.0.1', r));
  try {
    const bases = [base, `http://127.0.0.1:${server2.address().port}`];
    const shapes = [{ coachId: 'omar', pitchId: 'smouha' }, { coachId: 'omar' }, { coachId: 'omar', pitchId: 'gleem' }, { coachId: 'omar', resource: 'football/coastal/0/1' }];
    const statuses = await Promise.all(Array.from({ length: 40 }, (_, i) => fetch(bases[i % 2] + '/api/holds', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + A },
      body: JSON.stringify({ day, hour: 17, ...shapes[i % 4] }),
    }).then(r => r.status)));
    assert.equal(statuses.filter(s => s === 201).length, 1);
    assert.equal(statuses.filter(s => s === 409).length, 39, `unexpected statuses: ${statuses}`);
  } finally { await new Promise(r => server2.close(r)); await second.close(); }
}, { only: 'postgres' });
