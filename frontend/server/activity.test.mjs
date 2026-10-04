import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './auth.mjs';
import { DiscoveryError } from './discovery.mjs';

const origin = 'http://localhost:3000';
const account = { name: 'Test Birder', email: 'activity@example.test', password: 'test-only-long-password' };
const catalogue = { species: [{ id: 'indrol2', source: 'eBird' }], hotspots: [{ id: 'L123', source: 'eBird' }] };
async function fixture(options = {}) {
  let calls = 0;
  let unavailable = false;
  const { app, db } = createApp({ ...options, discovery: { catalogue: async () => {
    calls++;
    if (unavailable) throw new DiscoveryError(503, 'Discovery is unavailable.');
    return catalogue;
  } } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  const request = (path, method = 'GET', body, cookie, requestOrigin = origin) => fetch(base + path, {
    method, headers: { origin: requestOrigin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    db, request, calls: () => calls, unavailable: () => { unavailable = true; },
    register: async (email = account.email) => {
      const response = await request('auth/register', 'POST', { ...account, email });
      assert.equal(response.status, 201);
      return { cookie: response.headers.get('set-cookie').split(';')[0], user: (await response.json()).user };
    },
    close: () => new Promise((resolve) => server.close(() => { db.close(); resolve(); })),
  };
}

test('saves require a session, trusted catalogue, allowed origin and correct account ownership', async () => {
  const f = await fixture();
  try {
    for (const [path, method, body] of [['activity', 'GET'], ['activity/saves/species/indrol2', 'PUT', { saved: true }], ['activity/searches', 'POST', { term: 'Roller' }], ['activity/searches', 'DELETE', {}]]) {
      assert.equal((await f.request(path, method, body)).status, 401);
    }
    assert.equal(f.calls(), 0);
    const a = await f.register();
    const b = await f.register('other@example.test');
    assert.deepEqual(await (await f.request('activity', 'GET', undefined, a.cookie)).json(), { saves: [], searches: [] });
    assert.equal((await f.request('activity/saves/species/indrol2', 'PUT', { saved: true }, a.cookie, 'https://other.example')).status, 403);
    for (const [kind, id] of [['species', 'indrol2'], ['hotspot', 'L123']]) {
      assert.equal((await f.request(`activity/saves/${kind}/${id}`, 'PUT', { saved: true, user_id: b.user.id }, a.cookie)).status, 200);
      assert.equal((await f.request(`activity/saves/${kind}/${id}`, 'PUT', { saved: true }, a.cookie)).status, 200);
    }
    assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM discovery_saves').get().count, 2);
    assert.deepEqual(await (await f.request('activity', 'GET', undefined, b.cookie)).json(), { saves: [], searches: [] });
    await f.request('activity/saves/species/indrol2', 'PUT', { saved: false }, b.cookie);
    assert.equal((await (await f.request('activity', 'GET', undefined, a.cookie)).json()).saves.length, 2);
    for (const [path, body, status] of [
      ['species/unknown1', { saved: true }, 404], ['species/INVALID', { saved: true }, 400],
      ['post/indrol2', { saved: true }, 400], ['hotspot/L123', { saved: 'yes' }, 400], ['hotspot/L123', null, 400],
    ]) assert.equal((await f.request(`activity/saves/${path}`, 'PUT', body, a.cookie)).status, status);
    f.unavailable();
    assert.equal((await f.request('activity/saves/species/indrol2', 'PUT', { saved: true }, a.cookie)).status, 503);
    assert.equal((await f.request('activity', 'GET', undefined, a.cookie)).status, 200);
    const before = f.calls();
    assert.equal((await f.request('activity/saves/species/indrol2', 'PUT', { saved: false }, a.cookie)).status, 200);
    assert.equal(f.calls(), before);
    assert.equal((await (await f.request('activity', 'GET', undefined, a.cookie)).json()).saves.length, 1);
    await f.request('auth/logout', 'POST', {}, a.cookie);
    assert.equal((await f.request('activity', 'GET', undefined, a.cookie)).status, 401);
  } finally { await f.close(); }
});

test('history is normalized, bounded, newest first, deduplicated and removable per account', async () => {
  const f = await fixture({ now: () => 1_000 });
  try {
    const a = await f.register();
    const b = await f.register('other@example.test');
    for (const term of ['', '   ', 'x'.repeat(101), 'bad\nterm', 42, null]) assert.equal((await f.request('activity/searches', 'POST', { term }, a.cookie)).status, 400);
    for (let i = 0; i < 12; i++) await f.request('activity/searches', 'POST', { term: `Bird ${i}` }, a.cookie);
    let state = await (await f.request('activity', 'GET', undefined, a.cookie)).json();
    assert.deepEqual(state.searches, Array.from({ length: 10 }, (_, i) => `Bird ${11 - i}`));
    state = await (await f.request('activity/searches', 'POST', { term: '  BIRD   4 ' }, a.cookie)).json();
    assert.equal(state.searches[0], 'BIRD 4');
    assert.equal(state.searches.filter((term) => term.toLowerCase() === 'bird 4').length, 1);
    await f.request('activity/searches', 'POST', { term: "bird'; DROP TABLE users; --" }, b.cookie);
    await f.request('activity/searches', 'DELETE', {}, b.cookie);
    assert.equal((await (await f.request('activity', 'GET', undefined, a.cookie)).json()).searches.length, 10);
    state = await (await f.request('activity/searches', 'DELETE', { term: 'bird 4' }, a.cookie)).json();
    assert.equal(state.searches.length, 9);
    assert.equal((await f.request('activity/searches', 'DELETE', { term: 42 }, a.cookie)).status, 400);
    state = await (await f.request('activity/searches', 'DELETE', {}, a.cookie)).json();
    assert.deepEqual(state.searches, []);
    assert.equal(f.calls(), 0);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 2);
  } finally { await f.close(); }
});

test('saved references and searches survive database reopen and enforce the saved-item bound', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bw-activity-'));
  const dbPath = join(directory, 'test.sqlite');
  let f;
  try {
    f = await fixture({ dbPath });
    const a = await f.register();
    await f.request('activity/saves/hotspot/L123', 'PUT', { saved: true }, a.cookie);
    await f.request('activity/searches', 'POST', { term: 'Wetland' }, a.cookie);
    await f.close();
    f = await fixture({ dbPath });
    assert.deepEqual(await (await f.request('activity', 'GET', undefined, a.cookie)).json(), { saves: [{ kind: 'hotspot', id: 'L123' }], searches: ['Wetland'] });
    const insert = f.db.prepare('INSERT INTO discovery_saves VALUES (?, ?, ?, ?)');
    for (let i = 0; i < 499; i++) insert.run(a.user.id, 'hotspot', `L${i + 1000}`, i);
    assert.equal((await f.request('activity/saves/species/indrol2', 'PUT', { saved: true }, a.cookie)).status, 409);
    assert.equal((await f.request('activity/saves/hotspot/L123', 'PUT', { saved: true }, a.cookie)).status, 200);
    await f.request('activity/saves/hotspot/L123', 'PUT', { saved: false }, a.cookie);
    assert.equal((await f.request('activity/saves/species/indrol2', 'PUT', { saved: true }, a.cookie)).status, 200);
  } finally {
    if (f) await f.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
