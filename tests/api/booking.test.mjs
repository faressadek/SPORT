import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, createStore } from '../../apps/api/src/server.mjs';

async function startTestServer() {
  const store = createStore();
  const server = createApp(store);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  return { server, store, base };
}

test('BOOK-01: Atomic combined booking (Flexible Coach + Court) & race conflict rejection', async () => {
  const { server, base } = await startTestServer();
  try {
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-athlete-marwan' };
    const day = '2026-12-01T12:00:00.000Z';

    // 1. Hold flexible coach Omar + North Pitch together
    const holdRes = await fetch(`${base}/api/holds`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ day, hour: 10, coachId: 'omar', pitchId: 'smouha' }),
    });
    assert.equal(holdRes.status, 201);
    const hold = await holdRes.json();
    assert.equal(hold.total, 900); // 400 Omar + 500 North Pitch

    // 2. Concurrent attempt on North Pitch alone at the same hour must fail with 409 Conflict
    const raceRes = await fetch(`${base}/api/holds`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ day, hour: 10, pitchId: 'smouha' }),
    });
    assert.equal(raceRes.status, 409);

    // 3. Idempotent capture succeeds and repeated replay returns identical result
    const cap1 = await fetch(`${base}/api/checkout/capture`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bookingId: hold.bookingId, idempotencyKey: 'key-123' }),
    });
    assert.equal(cap1.status, 200);
    const cap2 = await fetch(`${base}/api/checkout/capture`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bookingId: hold.bookingId, idempotencyKey: 'key-123' }),
    });
    assert.equal(cap2.status, 200);
    assert.deepEqual(await cap1.json(), await cap2.json());
  } finally {
    server.close();
  }
});

test('BOOK-02: Expired hold reallocates slot and queues automatic refund on late capture', async () => {
  const { server, store, base } = await startTestServer();
  try {
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo-athlete-marwan' };
    const day = '2026-12-02T12:00:00.000Z';

    const r1 = await fetch(`${base}/api/holds`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ day, hour: 16, pitchId: 'gleem' }),
    });
    const b1 = await r1.json();

    // Force hold expiration
    store.bookings.get(b1.bookingId).holdExpiresAt = Date.now() - 1000;

    // Second booking claims the expired slot
    const r2 = await fetch(`${base}/api/holds`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ day, hour: 16, pitchId: 'gleem' }),
    });
    assert.equal(r2.status, 201);

    // Late payment capture for b1 must NOT overwrite b2 and must queue refund
    const lateCap = await fetch(`${base}/api/checkout/capture`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bookingId: b1.bookingId, idempotencyKey: 'late-cap-1' }),
    });
    assert.equal(lateCap.status, 409);
    const body = await lateCap.json();
    assert.equal(body.status, 'REFUND_PENDING');
    assert.equal(store.outbox.length, 1);
  } finally {
    server.close();
  }
});

test('RBAC-01: Provider & Admin role enforcement and Gym/Academy enquiry submission', async () => {
  const { server, base } = await startTestServer();
  try {
    // Athlete cannot access provider overview
    const forbidden = await fetch(`${base}/api/provider/overview`, {
      headers: { 'Authorization': 'Bearer demo-athlete-marwan' },
    });
    assert.equal(forbidden.status, 403);

    // Enquiry submission succeeds
    const enqRes = await fetch(`${base}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'academy', targetId: 'kick-smash-padel', name: 'Marwan', phone: '+201000000000' }),
    });
    assert.equal(enqRes.status, 201);
  } finally {
    server.close();
  }
});
