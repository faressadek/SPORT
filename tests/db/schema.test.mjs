// Loads db/schema.sql into a throwaway PostgreSQL database and checks the double-booking rules.
// Needs `psql` and DATABASE_URL pointing at a server where the user may create databases.
// Skips (does not fail) when DATABASE_URL is not set.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ADMIN_URL = process.env.DATABASE_URL;
const schema = fileURLToPath(new URL('../../db/schema.sql', import.meta.url));
const dbName = `sport_test_${process.pid}`;
const dbUrl = ADMIN_URL && (() => { const u = new URL(ADMIN_URL); u.pathname = '/' + dbName; return u.toString(); })();

const psql = (url, sql) => execFileSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-qtAX', '-c', sql], { encoding: 'utf8' }).trim();
const tryPsql = (url, sql) => { try { return { ok: true, out: psql(url, sql) }; } catch (e) { return { ok: false, err: String(e.stderr || e.message) }; } };
const slot = h => `tstzrange('2026-12-01 ${h}:00+02','2026-12-01 ${h + 1}:00+02','[)')`;
const hold = (id, h, resources) => `
  SET search_path TO sport, public;
  BEGIN;
  INSERT INTO bookings (id, athlete_id, status, slot_range, total_egp_minor, hold_expires_at)
    VALUES ('${id}', 'demo-athlete-marwan', 'HOLD', ${slot(h)}, 0, now() + interval '5 minutes');
  INSERT INTO booking_allocations (booking_id, resource_id, slot_range, price_egp_minor) VALUES
    ${resources.map(r => `('${id}', '${r}', ${slot(h)}, 0)`).join(',')};
  SELECT pg_sleep(0.3);
  COMMIT;`;

test('DB: schema loads and enforces one booking per resource per hour', { skip: !ADMIN_URL && 'DATABASE_URL not set' }, async t => {
  psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${dbName}`);
  psql(ADMIN_URL, `CREATE DATABASE ${dbName}`);
  t.after(() => psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${dbName}`));
  execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-q', '-f', schema]);

  await t.test('combined coach + court hold succeeds', () => {
    assert.ok(tryPsql(dbUrl, hold('B1', 10, ['omar', 'smouha'])).ok);
  });
  await t.test('back-to-back hour on the same coach is allowed (half-open ranges)', () => {
    assert.ok(tryPsql(dbUrl, hold('B2', 11, ['omar'])).ok);
  });
  await t.test('a request sharing only the coach fails and leaves its court free', () => {
    const r = tryPsql(dbUrl, hold('B3', 10, ['gleem', 'omar']));
    assert.ok(!r.ok && /exclusion constraint/.test(r.err));
    assert.equal(psql(dbUrl, `SELECT count(*) FROM sport.booking_allocations WHERE resource_id = 'gleem'`), '0');
    assert.equal(psql(dbUrl, `SELECT count(*) FROM sport.bookings WHERE id = 'B3'`), '0');
  });
  await t.test('two simultaneous transactions for the same coach: exactly one commits', async () => {
    const run = (id, court) => new Promise(resolve => {
      const p = spawn('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-qtAX', '-c', hold(id, 17, ['omar', court])]);
      p.on('close', code => resolve(code));
    });
    const codes = await Promise.all([run('R1', 'smouha'), run('R2', 'gleem')]);
    assert.deepEqual(codes.sort(), [0, 1]);
    assert.equal(psql(dbUrl, `SELECT count(*) FROM sport.booking_allocations WHERE resource_id = 'omar' AND slot_range && ${slot(17)}`), '1');
  });
  await t.test('releasing an allocation frees the slot for a new hold', () => {
    psql(dbUrl, `UPDATE sport.booking_allocations SET active = false WHERE booking_id = 'B1'`);
    assert.ok(tryPsql(dbUrl, hold('B4', 10, ['smouha'])).ok);
  });
});
