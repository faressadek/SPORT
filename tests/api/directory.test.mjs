// Gyms and Academies: listings come from the store (PostgreSQL when DATABASE_URL is set), search filters, moderation, enquiries.
import assert from 'node:assert/strict';
import { storeTest } from './harness.mjs';
import { GYMS, ACADEMIES } from '../../apps/api/src/catalog.mjs';

const ids = list => list.map(l => l.id);
const get = async (call, path) => { const r = await call('GET', path); assert.equal(r.status, 200); return r.json(); };

storeTest('DIR-01 gyms and academies are listed from the store, without owner details', async ({ call }) => {
  const { gyms } = await get(call, '/api/gyms');
  assert.deepEqual(ids(gyms), ids(GYMS));
  assert.deepEqual(gyms[0].plans, { Monthly: 1450, Quarterly: 3800, Annual: 12500 });
  assert.ok(gyms.every(g => !('ownerId' in g)));
  const { academies } = await get(call, '/api/academies');
  assert.deepEqual(ids(academies), ids(ACADEMIES));
  assert.equal(academies.find(a => a.id === 'kick-smash-padel').price, 2200);
});

storeTest('DIR-02 search filters by area, facility, sport, age, level and text', async ({ call }) => {
  assert.deepEqual(ids((await get(call, '/api/gyms?facility=Pool')).gyms), ['gold-smouha', 'montaza-wellness']);
  assert.deepEqual(ids((await get(call, '/api/gyms?area=Gleem')).gyms), ['gleem-bay-fit']);
  assert.deepEqual(ids((await get(call, '/api/gyms?sort=price&billing=Annual')).gyms), ['sporting-iron', 'gold-smouha', 'montaza-wellness', 'gleem-bay-fit']);
  assert.deepEqual(ids((await get(call, '/api/gyms?q=women')).gyms), ['gleem-bay-fit', 'montaza-wellness']);
  assert.deepEqual(ids((await get(call, '/api/academies?sport=Football')).academies), ['alex-striker-fc']);
  assert.deepEqual(ids((await get(call, '/api/academies?age=' + encodeURIComponent('U8 (5–8 yrs)') + '&level=Intermediate')).academies), ['alex-striker-fc', 'gleem-tennis-pro']);
  assert.deepEqual(ids((await get(call, '/api/academies?q=psa')).academies), ['sporting-squash']);
  assert.deepEqual((await get(call, '/api/academies?area=Nowhere')).academies, []);
});

storeTest('DIR-03 enquiries need a real, published listing; kind and name come from the server', async ({ call }) => {
  const send = body => call('POST', '/api/enquiries', null, { name: 'Parent', phone: '+201111111111', ...body });
  assert.equal((await send({ targetId: 'no-such-gym' })).status, 404);
  const ok = await send({ kind: 'gym', targetId: 'alex-striker-fc', targetName: 'Fake name' });
  assert.equal(ok.status, 201);
  const enq = await ok.json();
  assert.equal(enq.kind, 'academy');
  assert.equal(enq.targetName, 'Alexandria Youth Football Academy');
  const owner = await (await call('GET', '/api/provider/overview', 'academy-alex-youth')).json();
  assert.deepEqual(owner.enquiries.map(e => e.id), [enq.id]);
});

storeTest('DIR-04 admin unpublishing hides a listing and stops enquiries', async ({ call }) => {
  assert.equal((await call('PATCH', '/api/admin/listings/sporting-iron', 'gym-apex', { published: false })).status, 403);
  assert.equal((await call('PATCH', '/api/admin/listings/sporting-iron', 'admin-sport', { published: 'no' })).status, 400);
  assert.equal((await call('PATCH', '/api/admin/listings/missing', 'admin-sport', { published: false })).status, 404);
  assert.equal((await call('PATCH', '/api/admin/listings/sporting-iron', 'admin-sport', { published: false })).status, 200);
  assert.ok(!ids((await get(call, '/api/gyms')).gyms).includes('sporting-iron'));
  assert.equal((await call('POST', '/api/enquiries', null, { targetId: 'sporting-iron', name: 'P', phone: '+201111111111' })).status, 404);
  assert.equal((await call('PATCH', '/api/admin/listings/sporting-iron', 'admin-sport', { published: true })).status, 200);
  assert.ok(ids((await get(call, '/api/gyms')).gyms).includes('sporting-iron'));
});

storeTest('DIR-05 listings, moderation and enquiries survive an API restart', async ({ store, url, kind }) => {
  if (kind !== 'postgres') return;
  const { createPgStore } = await import('../../apps/api/src/pg-store.mjs');
  await store.setListingPublished('gleem-tennis-pro', false);
  await store.addEnquiry({ athleteId: null, kind: 'gym', targetId: 'gold-smouha', targetName: 'Apex Athletic Club', name: 'Restart', phone: '+201000000000', participant: null, notes: '' });
  const again = await createPgStore(url); // a second server on the same database
  try {
    assert.equal((await again.getListing('gleem-tennis-pro')).published, false);
    const mine = await again.listEnquiries({ id: 'gym-apex', role: 'gym_operator' });
    assert.deepEqual(mine.map(e => e.name), ['Restart']);
  } finally { await again.close(); }
});
