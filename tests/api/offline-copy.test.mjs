// The athlete app keeps an offline copy of the gym and academy listings. It must match catalog.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { GYMS, ACADEMIES } from '../../apps/api/src/catalog.mjs';

const html = await readFile(new URL('../../apps/athlete-preview/index.html', import.meta.url), 'utf8');
const literal = name => JSON.parse(JSON.stringify(vm.runInNewContext(html.match(new RegExp(`let ${name} = (\\[[\\s\\S]*?\\n\\]);`))[1])));
const strip = list => list.map(({ ownerId, kind, ...l }) => l);

test('athlete app offline gyms and academies match catalog.mjs', () => {
  assert.deepEqual(literal('gymsData'), strip(GYMS));
  assert.deepEqual(literal('academiesData'), strip(ACADEMIES));
});
