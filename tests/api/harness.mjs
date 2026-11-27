// Runs each API test against the in-memory store and, when DATABASE_URL is set, against PostgreSQL.
// PostgreSQL runs get a fresh, throwaway database per test.
import test from 'node:test';
import crypto from 'node:crypto';
import pg from 'pg';
import { createApp } from '../../apps/api/src/server.mjs';
import { createMemoryStore } from '../../apps/api/src/memory-store.mjs';
import { createPgStore } from '../../apps/api/src/pg-store.mjs';

const ADMIN_URL = process.env.DATABASE_URL;

async function adminQuery(sql) {
  const c = new pg.Client({ connectionString: ADMIN_URL });
  await c.connect();
  try { await c.query(sql); } finally { await c.end(); }
}

const factories = [['memory', async () => ({ store: createMemoryStore(), url: null, cleanup: async () => {} })]];
if (ADMIN_URL) factories.push(['postgres', async () => {
  const name = 'sport_api_' + crypto.randomBytes(4).toString('hex');
  await adminQuery(`CREATE DATABASE ${name}`);
  const u = new URL(ADMIN_URL); u.pathname = '/' + name;
  const store = await createPgStore(u.toString());
  return { store, url: u.toString(), cleanup: async () => { await store.close(); await adminQuery(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`); } };
}]);

export const storeKinds = factories.map(f => f[0]);

export function storeTest(name, fn, { only } = {}) {
  for (const [kind, make] of factories) {
    if (only && only !== kind) continue;
    test(`${name} [${kind}]`, async () => {
      const { store, url, cleanup } = await make();
      const server = createApp(store);
      await new Promise(r => server.listen(0, '127.0.0.1', r));
      const base = `http://127.0.0.1:${server.address().port}`;
      const call = (method, path, token, body) => fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
      });
      try { await fn({ store, call, base, kind, url }); }
      finally { await new Promise(r => server.close(r)); await cleanup(); }
    });
  }
}
