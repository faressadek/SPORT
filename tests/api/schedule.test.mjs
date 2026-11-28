// Provider schedules: weekly opening hours and dated closures. Every test runs on both stores.
import assert from 'node:assert/strict';
import { storeTest } from './harness.mjs';

const A = 'demo-athlete-marwan';
const SUN = '2026-12-06', SUN_DAY = SUN + 'T12:00:00.000Z', MON_DAY = '2026-12-07T12:00:00.000Z';
const PITCH = 'football/coastal/0/1'; // Coastal Sports Club, owned by venue-coastal
const json = async r => ({ status: r.status, body: await r.json() });
const avail = async (call, day, ids) => (await (await call('GET', `/api/availability?day=${day}&resources=${ids.map(encodeURIComponent).join(',')}`)).json()).resources;

storeTest('SCH-01 providers see and change only their own hours', async ({ call }) => {
  const venue = (await json(await call('GET', '/api/provider/schedule', 'venue-coastal'))).body;
  assert.deepEqual(venue.targets.map(t => t.target), ['club:coastal']);
  const coach = (await json(await call('GET', '/api/provider/schedule', 'coach-omar'))).body;
  assert.deepEqual(coach.targets.map(t => t.target), ['omar']);
  assert.deepEqual(coach.targets[0].defaultHours, [10, 11, 17, 18]);
  const admin = (await json(await call('GET', '/api/provider/schedule', 'admin-sport'))).body;
  assert.equal(admin.targets.length, 6); // 3 coaches + 3 clubs
  assert.equal((await call('GET', '/api/provider/schedule', A)).status, 403);
  assert.equal((await call('PUT', '/api/provider/schedule/omar', 'coach-nour', { weekly: { 0: [9] } })).status, 403);
  assert.equal((await call('PUT', '/api/provider/schedule/club%3Aeast', 'venue-coastal', { weekly: { 0: [9] } })).status, 403);
  assert.equal((await call('PUT', '/api/provider/schedule/nobody', 'admin-sport', { weekly: { 0: [9] } })).status, 404);
});

storeTest('SCH-02 weekly hours replace the default and are enforced on holds', async ({ call }) => {
  assert.equal((await call('PUT', '/api/provider/schedule/omar', 'coach-omar', { weekly: { 0: [20, 19, 19] } })).status, 200);
  const sun = await avail(call, SUN_DAY, ['omar']), mon = await avail(call, MON_DAY, ['omar']);
  assert.deepEqual(sun.omar.openHours, [19, 20]);
  assert.deepEqual(mon.omar.openHours, [], 'no hours listed for Monday = closed');
  assert.equal((await call('POST', '/api/holds', A, { day: SUN_DAY, hour: 10, coachId: 'omar' })).status, 409, 'old default hour');
  assert.equal((await call('POST', '/api/holds', A, { day: SUN_DAY, hour: 19, coachId: 'omar' })).status, 201, 'new hour, outside the catalog default');
  // Reset to catalog hours
  assert.equal((await call('PUT', '/api/provider/schedule/omar', 'coach-omar', { weekly: null })).status, 200);
  assert.deepEqual((await avail(call, MON_DAY, ['omar'])).omar.openHours, [10, 11, 17, 18]);
});

storeTest('SCH-03 invalid schedules and closures are rejected', async ({ call }) => {
  for (const weekly of [{ 7: [9] }, { 0: [24] }, { 0: [9.5] }, { 0: '9' }, [9], 'x']) {
    assert.equal((await call('PUT', '/api/provider/schedule/omar', 'coach-omar', { weekly })).status, 400, JSON.stringify(weekly));
  }
  for (const body of [{ target: 'omar', day: '06/12/2026' }, { target: 'omar', day: SUN, hours: [25] }, { target: 'omar' }]) {
    assert.equal((await call('POST', '/api/provider/closures', 'coach-omar', body)).status, 400, JSON.stringify(body));
  }
});

storeTest('SCH-04 a club closure covers every court there, reports bookings in it, and can be removed', async ({ call }) => {
  const booked = await json(await call('POST', '/api/holds', A, { day: SUN_DAY, hour: 9, resource: PITCH }));
  assert.equal(booked.status, 201);
  const add = await json(await call('POST', '/api/provider/closures', 'venue-coastal', { target: 'club:coastal', day: SUN, hours: [9, 10], reason: 'Pitch maintenance <b>' }));
  assert.equal(add.status, 201);
  assert.deepEqual(add.body.affectedBookings.map(b => b.id), [booked.body.bookingId], 'existing booking reported, not cancelled');
  assert.equal(add.body.closure.reason, 'Pitch maintenance <b>');
  const a = await avail(call, SUN_DAY, [PITCH, 'padel/coastal/1/2', 'football/east/0/1']);
  assert.ok(!a[PITCH].openHours.includes(10) && a[PITCH].openHours.includes(11));
  assert.ok(!a['padel/coastal/1/2'].openHours.includes(9), 'all sports at the club');
  assert.ok(a['football/east/0/1'].openHours.includes(10), 'other clubs unaffected');
  assert.equal((await call('POST', '/api/holds', A, { day: SUN_DAY, hour: 10, resource: PITCH })).status, 409);
  assert.equal((await call('GET', `/api/bookings`, A)).status, 200);
  assert.equal((await (await call('GET', '/api/bookings', A)).json()).length, 1, 'booking inside the closure is kept');
  // Only the owner or an admin can remove it
  assert.equal((await call('DELETE', `/api/provider/closures/${add.body.closure.id}`, 'coach-omar')).status, 403);
  assert.equal((await call('DELETE', `/api/provider/closures/${add.body.closure.id}`, 'venue-coastal')).status, 200);
  assert.equal((await call('DELETE', `/api/provider/closures/${add.body.closure.id}`, 'venue-coastal')).status, 404);
  assert.equal((await call('POST', '/api/holds', A, { day: SUN_DAY, hour: 10, resource: PITCH })).status, 201);
});

storeTest('SCH-05 an all-day coach closure blocks the coach and a coach + pitch booking', async ({ call }) => {
  assert.equal((await call('POST', '/api/provider/closures', 'coach-omar', { target: 'omar', day: SUN, reason: 'Away' })).status, 201);
  assert.deepEqual((await avail(call, SUN_DAY, ['omar'])).omar.openHours, []);
  assert.equal((await call('POST', '/api/holds', A, { day: SUN_DAY, hour: 10, coachId: 'omar', pitchId: PITCH })).status, 409);
  assert.equal((await call('POST', '/api/holds', A, { day: MON_DAY, hour: 10, coachId: 'omar', pitchId: PITCH })).status, 201, 'next day is open');
});

storeTest('SCH-06 schedules survive a restart and are shared by two servers', async ({ store, url, kind }) => {
  if (kind !== 'postgres') return;
  const { createPgStore } = await import('../../apps/api/src/pg-store.mjs');
  await store.setWeekly('omar', { 0: [12] });
  await store.addClosure({ target: 'club:city', day: SUN, hours: null, reason: '', createdBy: 'admin-sport' });
  const again = await createPgStore(url);
  try {
    assert.deepEqual((await again.getSchedules()).get('omar'), { 0: [12] });
    assert.deepEqual((await again.listClosures()).map(c => [c.target, c.day, c.hours]), [['club:city', SUN, null]]);
  } finally { await again.close(); }
});
