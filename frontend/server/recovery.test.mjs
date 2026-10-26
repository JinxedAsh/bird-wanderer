import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createApp } from './auth.mjs';
import { configuredRecoveryMail } from './recovery-mail.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';

const origin = 'http://localhost:3000';
const account = { name: 'Recovery Birder', email: 'recovery@example.test', password: 'old-test-password-123' };
const newPassword = 'new-test-password-456';
const settle = () => new Promise((resolve) => setImmediate(resolve));
const cookie = (response) => response.headers.get('set-cookie')?.split(';')[0];
const token = (mail) => new URL(mail.url).hash.slice('#reset-password='.length);
async function fixture(options = {}) {
  const sent = [];
  const { app, db } = createApp({ recoveryMail: { send: async (message) => { sent.push(message); } }, ...options });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const request = (path, body, session, requestOrigin = origin) => fetch(`http://127.0.0.1:${server.address().port}/api/auth/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { origin: requestOrigin, ...(session ? { cookie: session } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { db, sent, request, close: async () => { await settle(); await new Promise((resolve) => server.close(resolve)); db.close(); } };
}

test('recovery unavailable/input/origin/rate failures are honest; account lookup response is generic and token stays hashed', async () => {
  const unconfigured = await fixture({ recoveryMail: undefined });
  try {
    const response = await unconfigured.request('recovery/request', { email: account.email });
    assert.equal(response.status, 503); assert.match((await response.json()).error, /No reset email/);
  } finally { await unconfigured.close(); }
  const f = await fixture();
  try {
    await f.request('register', account);
    assert.equal((await f.request('recovery/request', { email: account.email }, undefined, 'https://evil.test')).status, 403);
    assert.equal((await f.request('recovery/request', { email: '\r\ninvalid' })).status, 400);
    const exists = await f.request('recovery/request', { email: account.email });
    const absent = await f.request('recovery/request', { email: 'unknown@example.test' });
    assert.equal(exists.status, 202); assert.equal(absent.status, 202);
    assert.deepEqual(await exists.json(), await absent.json()); await settle();
    assert.equal(f.sent.length, 1);
    const rawToken = token(f.sent[0]); assert.match(rawToken, /^[a-f0-9]{64}$/);
    const row = f.db.prepare('SELECT * FROM password_resets').get();
    assert.notEqual(row.token_hash, rawToken);
    assert.equal(row.token_hash, createHash('sha256').update(rawToken).digest('hex'));
    await f.request('recovery/request', { email: 'unknown2@example.test' });
    await f.request('recovery/request', { email: 'unknown3@example.test' });
    const limited = await f.request('recovery/request', { email: account.email });
    assert.equal(limited.status, 429); assert.ok(limited.headers.get('retry-after'));
  } finally { await f.close(); }
});

test('reset is single-use, revokes all target sessions, preserves account and unrelated signed-in cookie', async () => {
  const f = await fixture();
  try {
    const a = await f.request('register', account); const aCookie = cookie(a); const aUser = (await a.json()).user;
    const secondCookie = cookie(await f.request('login', account));
    const bCookie = cookie(await f.request('register', { ...account, name: 'Other Birder', email: 'other@example.test' }));
    await f.request('recovery/request', { email: account.email }); await settle();
    const rawToken = token(f.sent[0]);
    const reset = await f.request('recovery/reset', { token: rawToken, password: newPassword }, bCookie);
    assert.equal(reset.status, 200); assert.deepEqual(await reset.json(), { reset: true });
    assert.equal(reset.headers.get('set-cookie'), null);
    assert.equal((await f.request('me', undefined, aCookie)).status, 401);
    assert.equal((await f.request('me', undefined, secondCookie)).status, 401);
    assert.equal((await f.request('me', undefined, bCookie)).status, 200);
    assert.equal((await f.request('login', account)).status, 401);
    const login = await f.request('login', { ...account, password: newPassword });
    assert.equal(login.status, 200); assert.deepEqual((await login.json()).user, aUser);
    assert.equal((await f.request('recovery/reset', { token: rawToken, password: 'another-password-123' })).status, 400);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM password_resets').get().n, 0);
  } finally { await f.close(); }
});

test('only newest unexpired link works, password changes invalidate links, invalid input cannot alter credentials', async () => {
  let time = Date.now(); const f = await fixture({ now: () => time });
  try {
    let session = cookie(await f.request('register', account));
    await f.request('recovery/request', { email: account.email }); await settle(); const old = token(f.sent[0]);
    await f.request('recovery/request', { email: account.email }); await settle(); const latest = token(f.sent[1]);
    assert.equal((await f.request('recovery/reset', { token: old, password: newPassword })).status, 400);
    for (const body of [{ token: latest, password: 'short' }, { token: 'bad', password: newPassword }, { token: latest, password: 'a'.repeat(129) }]) assert.equal((await f.request('recovery/reset', body)).status, 400);
    time += 15 * 60 * 1000;
    assert.equal((await f.request('recovery/reset', { token: latest, password: newPassword })).status, 400);
    await f.request('recovery/request', { email: account.email }); await settle(); const beforeChange = token(f.sent[2]);
    const changed = await f.request('change-password', { currentPassword: account.password, newPassword }, session);
    assert.equal(changed.status, 200); session = cookie(changed);
    assert.equal((await f.request('recovery/reset', { token: beforeChange, password: account.password })).status, 400);
    assert.equal((await f.request('me', undefined, session)).status, 200);
  } finally { await f.close(); }
});

test('concurrent reset consumes once and transaction failure keeps old sessions/password/link retryable', async () => {
  const f = await fixture();
  try {
    const session = cookie(await f.request('register', account));
    await f.request('recovery/request', { email: account.email }); await settle(); const rawToken = token(f.sent[0]);
    f.db.exec("CREATE TRIGGER fail_reset BEFORE UPDATE OF password_hash ON users BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
    assert.equal((await f.request('recovery/reset', { token: rawToken, password: newPassword })).status, 500);
    assert.equal((await f.request('me', undefined, session)).status, 200);
    assert.equal((await f.request('login', account)).status, 200);
    f.db.exec('DROP TRIGGER fail_reset');
    const results = await Promise.all([f.request('recovery/reset', { token: rawToken, password: newPassword }), f.request('recovery/reset', { token: rawToken, password: 'competing-password-123' })]);
    assert.deepEqual(results.map((response) => response.status).sort(), [200, 400]);
    assert.equal((await f.request('me', undefined, session)).status, 401);
  } finally { await f.close(); }
});

test('SMTP configuration is optional, TLS-only, bounded, text-only and requires provider acceptance', async () => {
  assert.equal(await configuredRecoveryMail({}), undefined);
  await assert.rejects(configuredRecoveryMail({ SMTP_HOST: 'smtp.example.test' }), /Complete all SMTP/);
  const env = { SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', SMTP_USER: 'demo', SMTP_PASSWORD: 'test-only', SMTP_FROM: 'demo@example.test' };
  let options, message;
  const factory = (input) => { options = input; return { sendMail: async (inputMessage) => { message = inputMessage; return { accepted: ['birder@example.test'] }; } }; };
  const mail = await configuredRecoveryMail(env, factory);
  assert.equal(options.requireTLS, true); assert.equal(options.secure, false);
  assert.equal(options.connectionTimeout, 10000); assert.equal(options.disableFileAccess, true); assert.equal(options.disableUrlAccess, true);
  await mail.send({ email: 'birder@example.test', url: `${origin}/#reset-password=${'a'.repeat(64)}` });
  assert.deepEqual(message.to, { address: 'birder@example.test' });
  assert.equal(message.html, undefined); assert.match(message.text, /latest link/); assert.equal(message.from.address, env.SMTP_FROM);
  await configuredRecoveryMail({ ...env, SMTP_PORT: '465' }, factory); assert.equal(options.secure, true);
  for (const invalid of [{ SMTP_PORT: '25' }, { SMTP_HOST: 'https://evil.test' }, { SMTP_FROM: 'bad\r\nBcc:other@example.test' }]) await assert.rejects(configuredRecoveryMail({ ...env, ...invalid }, factory));
  const rejected = await configuredRecoveryMail(env, () => ({ sendMail: async () => ({ accepted: [] }) }));
  await assert.rejects(rejected.send({ email: 'birder@example.test', url: origin }), /not accepted/);
  for (const email of ['name<birder@example.test>', 'birder@example.test,local', 'birder@example.test\r\nBcc:other']) await assert.rejects(mail.send({ email, url: origin }), /one plain recipient/);
});

test('failed old mail cannot remove newer link; dispatch capacity is bounded and recovers', async () => {
  const pending = [];
  const f = await fixture({ recoveryMail: { send: (mail) => new Promise((resolve, reject) => pending.push({ mail, resolve, reject })) } });
  try {
    await f.request('register', account);
    for (let i = 0; i < 3; i++) { assert.equal((await f.request('recovery/request', { email: account.email })).status, 202); await settle(); }
    assert.equal(pending.length, 3);
    assert.equal((await f.request('recovery/request', { email: 'other@example.test' })).status, 503);
    const latest = token(pending[2].mail);
    pending[0].reject(new Error('synthetic SMTP failure')); pending[1].resolve(); pending[2].resolve(); await settle();
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM password_resets').get().n, 1);
    assert.equal((await f.request('recovery/reset', { token: latest, password: newPassword })).status, 200);
    assert.equal((await f.request('recovery/request', { email: 'other@example.test' })).status, 202);
  } finally { pending.forEach((entry) => entry.resolve()); await f.close(); }
});

test('hashed recovery link survives database restart and can reset only the recorded account', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'bird-recovery-test-'));
  const dbPath = join(folder, 'app.sqlite');
  let f = await fixture({ dbPath });
  try {
    await f.request('register', account);
    await f.request('recovery/request', { email: account.email }); await settle();
    const rawToken = token(f.sent[0]);
    await f.close(); f = await fixture({ dbPath });
    assert.equal((await f.request('recovery/reset', { token: rawToken, password: newPassword })).status, 200);
    assert.equal((await f.request('login', { ...account, password: newPassword })).status, 200);
  } finally {
    await f.close();
    const child = relative(tmpdir(), folder);
    assert.ok(!isAbsolute(child) && !child.startsWith('..') && child.startsWith('bird-recovery-test-'));
    rmSync(folder, { recursive: true, force: true });
  }
});
