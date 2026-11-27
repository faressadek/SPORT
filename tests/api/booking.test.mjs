import assert from 'node:assert/strict';
import { storeTest } from './harness.mjs';

const A = 'demo-athlete-marwan';

storeTest('BOOK-01 flexible coach + court reserved together; the court alone is then taken; capture replays', async ({ call }) => {
  const day = '2026-12-01T12:00:00.000Z';
  const holdRes = await call('POST', '/api/holds', A, { day, hour: 10, coachId: 'omar', pitchId: 'smouha' });
  assert.equal(holdRes.status, 201);
  const hold = await holdRes.json();
  assert.equal(hold.total, 900); // 400 Omar + 500 North Pitch
  assert.equal(hold.label, 'North Pitch + Omar Adel');

  assert.equal((await call('POST', '/api/holds', A, { day, hour: 10, pitchId: 'smouha' })).status, 409);

  const cap1 = await call('POST', '/api/checkout/capture', A, { bookingId: hold.bookingId, idempotencyKey: 'key-123' });
  const cap2 = await call('POST', '/api/checkout/capture', A, { bookingId: hold.bookingId, idempotencyKey: 'key-123' });
  assert.equal(cap1.status, 200);
  assert.equal(cap2.status, 200);
  assert.deepEqual(await cap1.json(), await cap2.json());
});

storeTest('BOOK-02 expired hold is reallocated; the late capture is refunded and the new booking kept', async ({ call, store }) => {
  const day = '2026-12-02T12:00:00.000Z';
  const b1 = await (await call('POST', '/api/holds', A, { day, hour: 16, pitchId: 'gleem' })).json();
  await store.testing.expireHold(b1.bookingId);
  const r2 = await call('POST', '/api/holds', A, { day, hour: 16, pitchId: 'gleem' });
  assert.equal(r2.status, 201);
  const b2 = await r2.json();

  const late = await call('POST', '/api/checkout/capture', A, { bookingId: b1.bookingId, idempotencyKey: 'late-cap-1' });
  assert.equal(late.status, 409);
  assert.equal((await late.json()).status, 'REFUND_PENDING');
  assert.equal((await store.listOutbox()).length, 1);
  assert.equal((await store.getBooking(b2.bookingId)).status, 'HOLD');
});

storeTest('BOOK-03 late capture confirms when the slot is still free', async ({ call, store }) => {
  const day = '2026-12-02T12:00:00.000Z';
  const b = await (await call('POST', '/api/holds', A, { day, hour: 17, pitchId: 'gleem' })).json();
  await store.testing.expireHold(b.bookingId);
  const late = await call('POST', '/api/checkout/capture', A, { bookingId: b.bookingId, idempotencyKey: 'k' });
  assert.equal(late.status, 200);
  assert.equal((await late.json()).late, true);
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 17, pitchId: 'gleem' })).status, 409);
});

storeTest('BOOK-04 bookings list, availability, and cancel', async ({ call }) => {
  const day = '2026-12-03T12:00:00.000Z';
  const b = await (await call('POST', '/api/holds', A, { day, hour: 9, coachId: 'nour' })).json();
  const list = await (await call('GET', '/api/bookings', A)).json();
  assert.equal(list.length, 1);
  assert.deepEqual([list[0].day, list[0].hour, list[0].coach, list[0].pitch], [day, 9, 'nour', null]);
  assert.deepEqual((await (await call('GET', `/api/availability?day=${day}&resources=nour`)).json()).busyHours, [9]);
  assert.equal((await call('POST', `/api/bookings/${b.bookingId}/cancel`, A)).status, 200);
  assert.equal((await (await call('GET', '/api/bookings', A)).json()).length, 0);
  assert.equal((await call('POST', '/api/holds', A, { day, hour: 9, coachId: 'nour' })).status, 201);
});

storeTest('BOOK-05 facility court priced by the server, owner sees it', async ({ call }) => {
  const day = '2026-12-03T12:00:00.000Z';
  const r = await (await call('POST', '/api/holds', A, { day, hour: 15, resource: 'padel/east/1/1' })).json();
  assert.equal(r.total, 595);
  const venue = await (await call('GET', '/api/provider/overview', 'venue-coastal')).json();
  assert.equal(venue.bookings.length, 0, 'Eastside is not Coastal’s club');
  await call('POST', '/api/holds', A, { day, hour: 15, resource: 'football/coastal/0/1' });
  assert.equal((await (await call('GET', '/api/provider/overview', 'venue-coastal')).json()).bookings.length, 1);
});

storeTest('RBAC-01 roles enforced; public enquiry accepted', async ({ call }) => {
  assert.equal((await call('GET', '/api/provider/overview', A)).status, 403);
  assert.equal((await call('GET', '/api/bookings')).status, 401);
  assert.equal((await call('POST', '/api/holds', 'coach-nour', { day: '2026-12-03T12:00:00.000Z', hour: 9, coachId: 'nour' })).status, 403);
  const enq = await call('POST', '/api/enquiries', null, { kind: 'academy', targetId: 'kick-smash-padel', name: 'Marwan', phone: '+201000000000' });
  assert.equal(enq.status, 201);
});

storeTest('ADMIN-01 unpublishing removes a resource from booking and the catalog', async ({ call }) => {
  assert.equal((await call('PATCH', '/api/admin/resources/gleem', 'venue-coastal', { published: false })).status, 403);
  assert.equal((await call('PATCH', '/api/admin/resources/gleem', 'admin-sport', { published: false })).status, 200);
  const cat = await (await call('GET', '/api/catalog')).json();
  assert.ok(!cat.resources.some(r => r.id === 'gleem'));
  assert.equal((await call('POST', '/api/holds', A, { day: '2026-12-03T12:00:00.000Z', hour: 10, pitchId: 'gleem' })).status, 400);
});
