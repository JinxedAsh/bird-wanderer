import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';
import { createApp } from './auth.mjs';

const origin = 'http://localhost:3000';
const account = { name: 'Test Birder', email: 'birder@example.test', password: 'test-only-long-password' };
async function fixture(options = {}) {
  const { app, db } = createApp(options);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/auth/`;
  return {
    db,
    request: (path, body, cookie, requestOrigin = origin) => fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { origin: requestOrigin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    close: () => new Promise((resolve) => server.close(() => { db.close(); resolve(); })),
  };
}
const cookie = (response) => response.headers.get('set-cookie').split(';')[0];

test('register, restore session, reject bad password, rotate session and invalidate logout', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.request('me')).status, 401);
    const registered = await f.request('register', account);
    assert.equal(registered.status, 201);
    const user = (await registered.json()).user;
    assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'name']);
    const session = cookie(registered);
    assert.match(registered.headers.get('set-cookie'), /HttpOnly/);
    assert.match(registered.headers.get('set-cookie'), /SameSite=Lax/);
    assert.equal((await (await f.request('me', undefined, session)).json()).user.id, user.id);
    const stored = f.db.prepare('SELECT * FROM users').get();
    assert.notEqual(stored.password_hash, account.password);
    assert.equal(stored.password_hash.length, 128);
    assert.notEqual(f.db.prepare('SELECT token_hash FROM sessions').get().token_hash, session.split('=')[1]);
    assert.equal((await f.request('login', { ...account, password: 'wrong' })).status, 401);
    assert.equal((await f.request('login', { ...account, email: 'missing@example.test' })).status, 401);
    const login = await f.request('login', { ...account, email: ' BIRDER@EXAMPLE.TEST ' }, session);
    assert.equal(login.status, 200);
    const rotated = cookie(login);
    assert.notEqual(rotated, session);
    assert.equal((await f.request('me', undefined, session)).status, 401);
    assert.equal((await f.request('logout', {}, rotated)).status, 204);
    assert.equal((await f.request('me', undefined, rotated)).status, 401);
  } finally { await f.close(); }
});

test('validation, duplicate email, foreign origin and malformed cookies', async () => {
  const f = await fixture();
  try {
    assert.equal((await f.request('register', { ...account, password: 'short' })).status, 400);
    assert.equal((await f.request('register', { ...account, email: 'invalid' })).status, 400);
    assert.equal((await f.request('register', null)).status, 400);
    assert.equal((await f.request('register', account, undefined, 'https://other.example')).status, 403);
    assert.equal((await f.request('register', account)).status, 201);
    assert.equal((await f.request('register', { ...account, email: account.email.toUpperCase() })).status, 409);
    assert.equal((await f.request('me', undefined, 'bw_session=%ZZ')).status, 401);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
  } finally { await f.close(); }
});

test('session expires and production cookie is secure', async () => {
  let time = Date.now();
  const f = await fixture({ now: () => time, secureCookies: true });
  try {
    const response = await f.request('register', account);
    assert.match(response.headers.get('set-cookie'), /Secure/);
    const session = cookie(response);
    time += 8 * 24 * 60 * 60 * 1000;
    assert.equal((await f.request('me', undefined, session)).status, 401);
  } finally { await f.close(); }
});

test('rate limiting blocks repeated authentication attempts', async () => {
  const f = await fixture({ rateLimit: 2 });
  try {
    await f.request('login', { ...account, password: 'bad' });
    await f.request('login', { ...account, password: 'bad' });
    const response = await f.request('login', account);
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get('retry-after')) > 0);
  } finally { await f.close(); }
});

test('accounts and sessions survive restart; separate users retain separate identities', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bird-wanderer-test-'));
  const dbPath = join(dir, 'auth.sqlite');
  let f = await fixture({ dbPath });
  try {
    const first = await f.request('register', account);
    const firstCookie = cookie(first);
    const second = await f.request('register', { ...account, name: 'Second Birder', email: 'second@example.test' });
    const secondCookie = cookie(second);
    await f.close();
    f = await fixture({ dbPath });
    assert.equal((await (await f.request('me', undefined, firstCookie)).json()).user.email, account.email);
    assert.equal((await (await f.request('me', undefined, secondCookie)).json()).user.email, 'second@example.test');
    await f.request('logout', {}, firstCookie);
    assert.equal((await f.request('me', undefined, secondCookie)).status, 200);
  } finally {
    await f.close();
    const temporaryRelativePath = relative(tmpdir(), dir);
    assert.ok(temporaryRelativePath.startsWith('bird-wanderer-test-') && !temporaryRelativePath.includes('..') && !isAbsolute(temporaryRelativePath));
    rmSync(dir, { recursive: true, force: true });
  }
});
