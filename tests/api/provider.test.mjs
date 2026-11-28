// Provider workspaces: walk-ins and blocks, check-in, prices, enquiry pipeline, listing edits. Both stores.
import assert from 'node:assert/strict';
import { storeTest } from './harness.mjs';

const A = 'demo-athlete-marwan', V = 'venue-coastal';
const DAY = '2026-12-08T12:00:00.000Z', PITCH = 'football/coastal/0/2';
const json = async r => ({ status: r.status, body: await r.json() });

storeTest('PRV-01 a walk-in on the venue calendar takes the court away from athletes and coaches', async ({ call }) => {
  const w = await json(await call('POST', '/api/provider/blocks', V, { resource: PITCH, day: DAY, hour: 19, source: 'walkin', note: 'Paid at desk' }));
  assert.equal(w.status, 201);
  assert.equal(w.body.status, 'CONFIRMED');
  assert.equal(w.body.total, 500);
  assert.equal((await call('POST', '/api/holds', A, { day: DAY, hour: 19, resource: PITCH })).status, 409, 'athlete cannot book it');
  assert.equal((await call('POST', '/api/holds', A, { day: DAY, hour: 19, coachId: 'omar', pitchId: PITCH })).status, 409, 'nor can a coach + court booking');
  assert.equal((await (await call('GET', '/api/holds', A)).status), 404);
  const avail = (await (await call('GET', `/api/availability?day=${DAY}&resources=${encodeURIComponent(PITCH)}`)).json()).resources[PITCH];
  assert.deepEqual(avail.busyHours, [19]);
  const cal = (await json(await call('GET', `/api/provider/calendar?day=${DAY}&club=coastal&sport=football&branch=0`, V))).body;
  assert.equal(cal.resources.length, 3);
  const slot = cal.resources.find(r => r.id === PITCH).bookings[0];
  assert.deepEqual([slot.hour, slot.source, slot.note], [19, 'walkin', 'Paid at desk']);
  assert.equal((await (await call('GET', '/api/bookings', A)).json()).length, 0, 'walk-ins are not the athlete’s bookings');
});

storeTest('PRV-02 only the owner records walk-ins; blocks are free; closed hours are refused', async ({ call }) => {
  assert.equal((await call('POST', '/api/provider/blocks', V, { resource: 'football/east/0/1', day: DAY, hour: 19 })).status, 403);
  assert.equal((await call('POST', '/api/provider/blocks', A, { resource: PITCH, day: DAY, hour: 19 })).status, 403);
  assert.equal((await call('GET', `/api/provider/calendar?day=${DAY}&club=east`, V)).status, 403);
  const b = await json(await call('POST', '/api/provider/blocks', V, { resource: PITCH, day: DAY, hour: 20, source: 'block', note: 'Resurfacing' }));
  assert.equal(b.status, 201); assert.equal(b.body.total, 0);
  assert.equal((await call('POST', '/api/provider/blocks', V, { resource: PITCH, day: DAY, hour: 20 })).status, 409, 'already blocked');
  assert.equal((await call('POST', '/api/provider/blocks', V, { resource: PITCH, day: DAY, hour: 3 })).status, 409, 'outside opening hours');
  // A coach records a private session for themselves
  assert.equal((await call('POST', '/api/provider/blocks', 'coach-omar', { resource: 'omar', day: DAY, hour: 10 })).status, 201);
  assert.equal((await call('POST', '/api/holds', A, { day: DAY, hour: 10, coachId: 'omar' })).status, 409);
});

storeTest('PRV-03 check-in, and providers cancel only their own walk-ins', async ({ call }) => {
  const athlete = (await json(await call('POST', '/api/holds', A, { day: DAY, hour: 18, resource: PITCH }))).body;
  assert.equal((await call('POST', `/api/provider/bookings/${athlete.bookingId}/checkin`, V)).status, 409, 'a hold is not yet confirmed');
  await call('POST', '/api/checkout/capture', A, { bookingId: athlete.bookingId, idempotencyKey: 'k' });
  const ci = await json(await call('POST', `/api/provider/bookings/${athlete.bookingId}/checkin`, V));
  assert.equal(ci.status, 200); assert.ok(ci.body.checkedInAt);
  assert.equal((await call('POST', `/api/provider/bookings/${athlete.bookingId}/checkin`, 'coach-omar')).status, 404, 'not the coach’s booking');
  assert.equal((await call('POST', `/api/provider/bookings/${athlete.bookingId}/cancel`, V)).status, 403, 'paid athlete booking: refunds go through support');
  const w = (await json(await call('POST', '/api/provider/blocks', V, { resource: PITCH, day: DAY, hour: 21 }))).body;
  assert.equal((await call('POST', `/api/provider/bookings/${w.id}/cancel`, V)).status, 200);
  assert.equal((await call('POST', '/api/holds', A, { day: DAY, hour: 21, resource: PITCH })).status, 201, 'freed again');
});

storeTest('PRV-04 provider prices are what athletes are charged', async ({ call }) => {
  assert.equal((await call('PUT', '/api/provider/prices', V, { target: 'club:coastal:football', price: 640 })).status, 200);
  const branch1 = 'football/coastal/1/1'; // Smouha branch keeps its +25 step
  const h = (await json(await call('POST', '/api/holds', A, { day: DAY, hour: 12, resource: branch1 }))).body;
  assert.equal(h.total, 665);
  assert.equal((await (await call('GET', `/api/availability?day=${DAY}&resources=${encodeURIComponent(PITCH)}`)).json()).resources[PITCH].price, 640);
  assert.equal((await call('PUT', '/api/provider/prices', 'coach-omar', { target: 'omar', price: 450 })).status, 200);
  const c = (await json(await call('POST', '/api/holds', A, { day: DAY, hour: 11, coachId: 'omar', pitchId: PITCH }))).body;
  assert.equal(c.total, 450 + 640);
  assert.equal((await call('PUT', '/api/provider/prices', V, { target: 'omar', price: 300 })).status, 403);
  assert.equal((await call('PUT', '/api/provider/prices', V, { target: 'club:east:football', price: 300 })).status, 403);
  assert.equal((await call('PUT', '/api/provider/prices', V, { target: 'club:coastal:football', price: 10 })).status, 400);
  const me = (await json(await call('GET', '/api/provider/me', V))).body;
  assert.equal(me.clubs[0].sports.find(s => s.id === 'football').price, 640);
});

storeTest('PRV-05 enquiry pipeline: owners move their own enquiries along', async ({ call }) => {
  const e = (await json(await call('POST', '/api/enquiries', null, { targetId: 'alex-striker-fc', name: 'Mona', phone: '+201222222222', participant: '10 yrs' }))).body;
  const up = await json(await call('PATCH', `/api/provider/enquiries/${e.id}`, 'academy-alex-youth', { status: 'TRIAL', trialDate: '2026-12-10', note: 'Bring boots' }));
  assert.equal(up.status, 200);
  assert.deepEqual([up.body.status, up.body.trialDate, up.body.providerNote], ['TRIAL', '2026-12-10', 'Bring boots']);
  assert.equal((await call('PATCH', `/api/provider/enquiries/${e.id}`, 'gym-apex', { status: 'CLOSED' })).status, 404, 'not their enquiry');
  assert.equal((await call('PATCH', `/api/provider/enquiries/${e.id}`, 'academy-alex-youth', { status: 'WON' })).status, 400);
  const list = (await json(await call('GET', '/api/provider/overview', 'academy-alex-youth'))).body.enquiries;
  assert.equal(list[0].status, 'TRIAL');
});

storeTest('PRV-06 gyms and academies edit their own listing; athletes see the change', async ({ call }) => {
  const ok = await json(await call('PATCH', '/api/provider/listings/gold-smouha', 'gym-apex', { plans: { Monthly: 1500, Quarterly: 3900, Annual: 12800 }, facilities: ['Pool', 'Sauna'] }));
  assert.equal(ok.status, 200);
  const gym = (await (await call('GET', '/api/gyms')).json()).gyms.find(g => g.id === 'gold-smouha');
  assert.deepEqual([gym.plans.Monthly, gym.facilities], [1500, ['Pool', 'Sauna']]);
  assert.equal(gym.name, 'Apex Athletic Club', 'name stays: renames go through SPORT');
  assert.equal((await call('PATCH', '/api/provider/listings/gold-smouha', 'academy-alex-youth', { note: 'x' })).status, 404);
  assert.equal((await call('PATCH', '/api/provider/listings/gold-smouha', 'gym-apex', { plans: { Monthly: -1 } })).status, 400);
  assert.equal((await call('PATCH', '/api/provider/listings/alex-striker-fc', 'academy-alex-youth', { schedule: 'Mon & Wed · 17:00–18:30', price: 1700 })).status, 200);
  const acad = (await (await call('GET', '/api/academies')).json()).academies.find(a => a.id === 'alex-striker-fc');
  assert.deepEqual([acad.schedule, acad.price], ['Mon & Wed · 17:00–18:30', 1700]);
});

storeTest('PRV-07 prices and listing edits survive a restart (startup sync keeps provider edits)', async ({ store, url, kind }) => {
  if (kind !== 'postgres') return;
  const { createPgStore } = await import('../../apps/api/src/pg-store.mjs');
  await store.setPrice('club:coastal:padel', 700);
  await store.updateListing('gold-smouha', { hours: '05:00 – 01:00' });
  const again = await createPgStore(url);
  try {
    assert.equal((await again.getPrices()).get('club:coastal:padel'), 700);
    assert.equal((await again.getListing('gold-smouha')).hours, '05:00 – 01:00');
  } finally { await again.close(); }
});
