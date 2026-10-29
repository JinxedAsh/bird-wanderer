import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';
import { createApp } from './auth.mjs';
import { configuredRecoveryMail } from './recovery-mail.mjs';

const origin = 'http://localhost:3000';
const account = { name: 'Verification Birder', email: 'verify@example.test', password: 'synthetic-password-123' };
const settle = () => new Promise(resolve => setImmediate(resolve));
const cookie = response => response.headers.get('set-cookie')?.split(';')[0];
const token = mail => new URL(mail.url).hash.slice('#verify-email='.length);
async function fixture(options = {}) {
  const sent = [];
  const { app, db } = createApp({ recoveryMail: { sendVerification: async message => { sent.push(message); } }, ...options });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const request = (path, body, session, requestOrigin = origin) => fetch(`http://127.0.0.1:${server.address().port}/api/auth/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { origin: requestOrigin, ...(session ? { cookie: session } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { db, sent, request, close: async () => { await settle(); await new Promise(resolve => server.close(resolve)); db.close(); } };
}

test('registration dispatch is optional; status/resend require session and exact origin', async () => {
  const f = await fixture({ recoveryMail: undefined });
  try {
    const registered = await f.request('register', account); assert.equal(registered.status, 201);
    const session = cookie(registered); assert.equal((await registered.json()).user.emailVerified, false);
    assert.equal((await f.request('login', account)).status, 200);
    assert.deepEqual(await (await f.request('verification/status', undefined, session)).json(), { emailVerified: false });
    assert.equal((await f.request('verification/status')).status, 401);
    assert.equal((await f.request('verification/resend', {})).status, 401);
    assert.equal((await f.request('verification/resend', {}, session, 'https://evil.test')).status, 403);
    const unavailable = await f.request('verification/resend', {}, session);
    assert.equal(unavailable.status, 503); assert.match((await unavailable.json()).error, /No verification email/);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM email_verifications').get().n, 0);
  } finally { await f.close(); }
});

test('hashed single-use proof verifies only the emailed account without login or session changes; GET cannot consume it', async () => {
  const f = await fixture();
  try {
    const a = await f.request('register', account); const aSession = cookie(a); const aId = (await a.json()).user.id;
    await settle(); const raw = token(f.sent[0]);
    assert.match(raw, /^[a-f0-9]{64}$/);
    assert.equal(f.db.prepare('SELECT token_hash FROM email_verifications').get().token_hash, createHash('sha256').update(raw).digest('hex'));
    const b = await f.request('register', { ...account, email: 'other@example.test' }); const bSession = cookie(b);
    assert.equal((await f.request(`verification/confirm?token=${raw}`)).status, 404);
    assert.equal((await f.request('verification/confirm', { token: raw }, bSession, 'https://evil.test')).status, 403);
    const confirm = await f.request('verification/confirm', { token: raw }, bSession);
    assert.equal(confirm.status, 200); assert.equal(confirm.headers.get('set-cookie'), null);
    assert.deepEqual(await confirm.json(), { verified: true });
    assert.equal((await (await f.request('me', undefined, aSession)).json()).user.emailVerified, true);
    const other = (await (await f.request('me', undefined, bSession)).json()).user;
    assert.equal(other.emailVerified, false); assert.notEqual(other.id, aId);
    assert.equal((await f.request('verification/confirm', { token: raw })).status, 400);
    assert.equal((await f.request('me')).status, 401);
    assert.equal((await f.request('login', account)).status, 200);
    const count = f.sent.length;
    assert.equal((await f.request('verification/resend', {}, aSession)).status, 200); await settle(); assert.equal(f.sent.length, count);
    f.db.prepare('UPDATE users SET email=? WHERE id=?').run('replacement@example.test', aId);
    assert.deepEqual(await (await f.request('verification/status', undefined, aSession)).json(), { emailVerified: false });
  } finally { await f.close(); }
});

test('latest/expiry/email binding/rate limits prevent stale confirmation', async () => {
  let time = Date.now(); const f = await fixture({ now: () => time });
  try {
    const session = cookie(await f.request('register', account)); await settle(); const old = token(f.sent[0]);
    await f.request('verification/resend', {}, session); await settle(); const latest = token(f.sent[1]);
    assert.equal((await f.request('verification/confirm', { token: old })).status, 400);
    assert.equal((await f.request('verification/confirm', { token: 'bad' })).status, 400);
    time += 15 * 60 * 1000;
    assert.equal((await f.request('verification/confirm', { token: latest })).status, 400);
    await f.request('verification/resend', {}, session); await settle(); const beforeEmailChange = token(f.sent[2]);
    f.db.prepare('UPDATE users SET email=?').run('changed@example.test');
    assert.equal((await f.request('verification/confirm', { token: beforeEmailChange })).status, 400);
    for (let i = 0; i < 4; i++) await f.request('verification/resend', {}, session);
    const limited = await f.request('verification/resend', {}, session); assert.equal(limited.status, 429); assert.ok(limited.headers.get('retry-after'));
    assert.equal((await f.request('me', undefined, session)).status, 200);
  } finally { await f.close(); }
});

test('old SMTP failure cannot delete a newer link; bounded dispatch recovers without blocking registration', async () => {
  const pending = [];
  const f = await fixture({ recoveryMail: { sendVerification: mail => new Promise((resolve, reject) => pending.push({ mail, resolve, reject })) } });
  try {
    const session = cookie(await f.request('register', account)); await settle();
    for (let i = 0; i < 2; i++) { assert.equal((await f.request('verification/resend', {}, session)).status, 202); await settle(); }
    assert.equal(pending.length, 3);
    assert.equal((await f.request('verification/resend', {}, session)).status, 503);
    const registered = await f.request('register', { ...account, email: 'busy@example.test' }); assert.equal(registered.status, 201);
    pending[0].reject(new Error('synthetic SMTP failure')); pending[1].resolve(); pending[2].resolve(); await settle();
    assert.equal((await f.request('verification/confirm', { token: token(pending[0].mail) })).status, 400);
    assert.equal((await f.request('verification/confirm', { token: token(pending[2].mail) })).status, 200);
  } finally { pending.forEach(entry => entry.resolve()); await f.close(); }
});

test('failed dispatch invalidates its link; confirmation transaction rollback remains retryable', async () => {
  let failedToken;
  const failed = await fixture({ recoveryMail: { sendVerification: async mail => { failedToken = token(mail); throw new Error('synthetic rejection'); } } });
  try {
    const response = await failed.request('register', account); assert.equal(response.status, 201); await settle();
    assert.equal((await failed.request('verification/confirm', { token: failedToken })).status, 400);
  } finally { await failed.close(); }
  const f = await fixture();
  try {
    await f.request('register', account); await settle(); const raw = token(f.sent[0]);
    f.db.exec("CREATE TRIGGER fail_verify BEFORE INSERT ON verified_emails BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
    assert.equal((await f.request('verification/confirm', { token: raw })).status, 500);
    f.db.exec('DROP TRIGGER fail_verify');
    const results = await Promise.all([f.request('verification/confirm', { token: raw }), f.request('verification/confirm', { token: raw })]);
    assert.deepEqual(results.map(response => response.status).sort(), [200, 400]);
  } finally { await f.close(); }
});

test('additive legacy migration preserves rows; verification token/status survive restart', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'bird-verification-test-')); const dbPath = join(folder, 'app.sqlite');
  const legacy = new DatabaseSync(dbPath);
  legacy.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,salt TEXT NOT NULL,created_at INTEGER NOT NULL);
    INSERT INTO users VALUES ('legacy','Legacy Birder','legacy@example.test','unchanged-hash','unchanged-salt',1);`); legacy.close();
  let f = await fixture({ dbPath });
  try {
    assert.equal(f.db.prepare('SELECT password_hash FROM users WHERE id=?').get('legacy').password_hash, 'unchanged-hash');
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM verified_emails').get().n, 0);
    const session = cookie(await f.request('register', account)); await settle(); const raw = token(f.sent[0]);
    await f.close(); f = await fixture({ dbPath });
    assert.equal((await f.request('verification/confirm', { token: raw })).status, 200);
    await f.close(); f = await fixture({ dbPath });
    assert.deepEqual(await (await f.request('verification/status', undefined, session)).json(), { emailVerified: true });
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM verified_emails WHERE user_id=?').get('legacy').n, 0);
  } finally {
    await f.close(); const child = relative(tmpdir(), folder);
    assert.ok(!isAbsolute(child) && !child.startsWith('..') && child.startsWith('bird-verification-test-'));
    rmSync(folder, { recursive: true, force: true });
  }
});

test('reset remains independent from verification; TLS transport uses purpose-specific text', async () => {
  const reset = [];
  const f = await fixture({ recoveryMail: { send: async mail => { reset.push(mail); } } });
  try {
    await f.request('register', account);
    await f.request('recovery/request', { email: account.email }); await settle();
    const raw = new URL(reset[0].url).hash.slice('#reset-password='.length);
    assert.equal((await f.request('recovery/reset', { token: raw, password: 'replacement-password-456' })).status, 200);
    const login = await f.request('login', { ...account, password: 'replacement-password-456' });
    assert.equal((await login.json()).user.emailVerified, false);
  } finally { await f.close(); }
  let message;
  const env = { SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', SMTP_USER: 'test', SMTP_PASSWORD: 'synthetic', SMTP_FROM: 'sender@example.test' };
  const mail = await configuredRecoveryMail(env, () => ({ sendMail: async input => { message = input; return { accepted: [account.email] }; } }));
  await mail.sendVerification({ email: account.email, url: `${origin}/#verify-email=${'a'.repeat(64)}` });
  assert.match(message.subject, /Verify/); assert.match(message.text, /press Verify email/); assert.equal(message.html, undefined);
  assert.deepEqual(message.to, { address: account.email });
  await assert.rejects(mail.sendVerification({ email: 'other@example.test', url: origin }), /not accepted/);
  await assert.rejects(mail.sendVerification({ email: 'Name <other@example.test>', url: origin }), /plain recipient/);
});

test('emailed link origin must be exact and allowed; explicit stable origin is used', async () => {
  const mail = { origin: 'https://birdwanderer.example.test', sendVerification: async () => {} };
  // Invalid startup configuration is exercised through the module directly so
  // the test owns and closes its in-memory database even when setup throws.
  const { registerVerification } = await import('./verification.mjs');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users(id TEXT PRIMARY KEY);');
  try {
    for (const bad of ['https://evil.test', origin + '/', 'javascript:alert(1)']) assert.throws(() => registerVerification({}, db, {
      now: Date.now, origin, allowedOrigins: new Set([origin]), mail: { origin: bad }, requireSession() {}, rateLimit: 30,
    }), /exact allowed/);
  } finally { db.close(); }
  const sent = [];
  const f = await fixture({ additionalOrigins: [mail.origin], recoveryMail: { ...mail, sendVerification: async value => { sent.push(value); } } });
  try {
    assert.equal((await f.request('register', account)).status, 201); await settle();
    assert.equal(new URL(sent[0].url).origin, mail.origin);
  } finally { await f.close(); }
});
