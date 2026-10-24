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
    request: (path, body, cookie, requestOrigin = origin, forwardedFor) => fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { origin: requestOrigin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { cookie } : {}), ...(forwardedFor ? {'X-Forwarded-For':forwardedFor}:{}) },
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

test('phone origin supports login and sessions while unknown origins remain blocked', async () => {
  const phoneOrigin = 'http://192.168.1.3:3000';
  const f = await fixture({ additionalOrigins: [phoneOrigin] });
  try {
    assert.equal((await f.request('register', account)).status, 201);
    const login = await f.request('login', account, undefined, phoneOrigin);
    assert.equal(login.status, 200);
    const session = cookie(login);
    assert.equal((await f.request('me', undefined, session, phoneOrigin)).status, 200);
    for (const forbiddenOrigin of ['http://192.168.1.3:3001', 'http://192.168.1.3:3000.evil.test', 'https://other.example', 'null', '']) {
      assert.equal((await f.request('logout', {}, session, forbiddenOrigin)).status, 403);
    }
    assert.equal((await f.request('logout', {}, session, phoneOrigin)).status, 204);
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
    let firstCookie = cookie(first);
    const second = await f.request('register', { ...account, name: 'Second Birder', email: 'second@example.test' });
    const secondCookie = cookie(second);
    const changed = await f.request('change-password', { currentPassword:account.password, newPassword:'restart-new-long-passphrase' }, firstCookie);
    assert.equal(changed.status,200);firstCookie=cookie(changed);
    await f.close();
    f = await fixture({ dbPath });
    assert.equal((await (await f.request('me', undefined, firstCookie)).json()).user.email, account.email);
    assert.equal((await (await f.request('me', undefined, secondCookie)).json()).user.email, 'second@example.test');
    assert.equal((await f.request('login',account)).status,401);
    assert.equal((await f.request('login',{...account,password:'restart-new-long-passphrase'})).status,200);
    await f.request('logout', {}, firstCookie);
    assert.equal((await f.request('me', undefined, secondCookie)).status, 200);
  } finally {
    await f.close();
    const temporaryRelativePath = relative(tmpdir(), dir);
    assert.ok(temporaryRelativePath.startsWith('bird-wanderer-test-') && !temporaryRelativePath.includes('..') && !isAbsolute(temporaryRelativePath));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('password changes validate current credentials, rotate sessions and revoke push registrations atomically', async () => {
  const f = await fixture();
  try {
    const first = await f.request('register', account), firstSession = cookie(first);
    const user = (await first.json()).user;
    const otherSession = cookie(await f.request('login', account));
    const unrelated = cookie(await f.request('register', { ...account, email:'another@example.test' }));
    const input = { currentPassword:account.password, newPassword:'replacement-long-passphrase' };
    assert.equal((await f.request('change-password', input)).status,401);
    assert.equal((await f.request('change-password', input, firstSession,'https://evil.example')).status,403);
    for (const body of [null,{}, {...input,newPassword:'short'}, {...input,newPassword:account.password}, {...input,currentPassword:[]}, {...input,newPassword:'x'.repeat(129)}])
      assert.equal((await f.request('change-password',body,firstSession)).status,400);
    assert.equal((await f.request('change-password',{...input,currentPassword:'incorrect'},firstSession)).status,403);
    assert.equal((await f.request('me',undefined,firstSession)).status,200);
    const sessionHash=f.db.prepare('SELECT token_hash FROM sessions WHERE user_id=? LIMIT 1').get(user.id).token_hash;
    f.db.prepare('INSERT INTO push_devices VALUES (?,?,?,?)').run('synthetic-password-change-device',user.id,sessionHash,Date.now());
    const before=f.db.prepare('SELECT password_hash,salt FROM users WHERE id=?').get(user.id);
    f.db.exec("CREATE TRIGGER fail_password BEFORE UPDATE ON users BEGIN SELECT RAISE(ABORT,'fixture'); END");
    assert.equal((await f.request('change-password',input,firstSession)).status,500);
    assert.deepEqual(f.db.prepare('SELECT password_hash,salt FROM users WHERE id=?').get(user.id),before);
    assert.equal((await f.request('me',undefined,firstSession)).status,200);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM push_devices').get().n,1);
    f.db.exec('DROP TRIGGER fail_password');
    const response=await f.request('change-password',input,firstSession);
    assert.equal(response.status,200);const rotated=cookie(response);
    assert.equal((await response.json()).user.id,user.id);
    assert.notEqual(rotated,firstSession);
    for(const session of [firstSession,otherSession])assert.equal((await f.request('me',undefined,session)).status,401);
    assert.equal((await f.request('me',undefined,rotated)).status,200);
    assert.equal((await f.request('me',undefined,unrelated)).status,200);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM push_devices').get().n,0);
    assert.notEqual(f.db.prepare('SELECT salt FROM users WHERE id=?').get(user.id).salt,before.salt);
    assert.equal((await f.request('login',account)).status,401);
    assert.equal((await f.request('login',{...account,password:input.newPassword})).status,200);
  } finally { await f.close(); }
});

test('concurrent password changes allow one confirmed result and password attempts are rate-limited',async()=>{
  const f=await fixture();
  try{
    const session=cookie(await f.request('register',account));
    const results=await Promise.all(['first-new-long-password','second-new-long-password'].map(newPassword=>f.request('change-password',{currentPassword:account.password,newPassword},session)));
    assert.equal(results.filter(result=>result.status===200).length,1);
    assert.ok(results.some(result=>[401,409].includes(result.status)));
    const winner=results.find(result=>result.status===200);
    assert.equal((await f.request('me',undefined,cookie(winner))).status,200);
  }finally{await f.close();}
  const limited=await fixture({rateLimit:2});
  try{
    const session=cookie(await limited.request('register',account));
    const input={currentPassword:'incorrect',newPassword:'replacement-long-password'};
    assert.equal((await limited.request('change-password',input,session)).status,403);
    const blocked=await limited.request('change-password',input,session);
    assert.equal(blocked.status,429);assert.ok(Number(blocked.headers.get('retry-after'))>0);
  }finally{await limited.close();}
});

test('a session expiring during password hashing cannot change credentials',async()=>{
  const time=Date.now();let checking=false,calls=0;
  const f=await fixture({now:()=>checking&&++calls>=3?time+8*86400000:time});
  try{
    const session=cookie(await f.request('register',account));
    const before=f.db.prepare('SELECT password_hash,salt FROM users').get();
    checking=true;
    assert.equal((await f.request('change-password',{currentPassword:account.password,newPassword:'expiry-new-long-password'},session)).status,401);
    assert.deepEqual(f.db.prepare('SELECT password_hash,salt FROM users').get(),before);
  }finally{await f.close();}
});

test('only an explicitly trusted loopback proxy supplies client IPs and spoofed earlier hops cannot evade limits',async()=>{
  const proxied=await fixture({rateLimit:2,trustProxyLoopback:true});
  try{
    const attempt=(email,forwarded)=>proxied.request('login',{email,password:'incorrect'},undefined,origin,forwarded);
    assert.equal((await attempt('one@example.test','198.51.100.1, 192.0.2.20')).status,401);
    assert.equal((await attempt('two@example.test','198.51.100.2, 192.0.2.20')).status,401);
    assert.equal((await attempt('three@example.test','198.51.100.3, 192.0.2.20')).status,429);
    assert.equal((await attempt('four@example.test','192.0.2.21')).status,401,'another actual client has its own IP bucket');
  }finally{await proxied.close();}
  const direct=await fixture({rateLimit:2});
  try{
    for(let i=0;i<3;i++)assert.equal((await direct.request('login',{email:`direct${i}@example.test`,password:'incorrect'},undefined,origin,`192.0.2.${i+1}`)).status,i<2?401:429,'default server ignores forwarded headers');
  }finally{await direct.close();}
});
