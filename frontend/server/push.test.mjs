import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { createApp } from './auth.mjs';
import { configuredPush } from './push.mjs';

test('Firebase configuration stays disabled without credentials and rejects invalid public settings', async () => {
  assert.deepEqual(await configuredPush({}), {});
  await assert.rejects(
    configuredPush({
      FIREBASE_SERVICE_ACCOUNT_PATH: 'unused',
      FIREBASE_WEB_CONFIG: '{}',
      FIREBASE_VAPID_PUBLIC_KEY: 'not-valid',
    }),
    /Invalid FIREBASE_WEB_CONFIG/,
  );
});

test('push outbox retries generic payloads, rechecks privacy/preferences/session, removes invalid tokens and revokes on logout', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'bird-push-'));
  let time = Date.now(),
    mode = 'failure',
    calls = [],
    onSend = async () => {};
  const current = createApp({
    dbPath: join(directory, 'test.sqlite'),
    mediaPath: join(directory, 'media'),
    now: () => time,
    discovery: {
      catalogue: async () => ({
        species: [{ id: 'indrol2', name: 'Indian Roller', scientificName: 'Coracias benghalensis' }],
        hotspots: [{ id: 'L123', name: 'Test Wetland' }],
      }),
    },
    push: {
      webConfig: { projectId: 'fixture' },
      vapidKey: 'fixture-public',
      send: async (message) => {
        calls.push(message);
        await onSend();
        if (mode === 'failure') throw new Error('Synthetic provider failure');
        if (mode === 'invalid')
          throw Object.assign(new Error('Synthetic invalid token'), {
            code: 'messaging/registration-token-not-registered',
          });
        return 'fixture-accepted';
      },
    },
  });
  const server = current.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    current.db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const request = (path, cookie, method = 'GET', body, type = 'application/json') =>
    fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
      method,
      headers: {
        Origin: 'http://localhost:3000',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body !== undefined ? { 'Content-Type': type } : {}),
      },
      body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
    });
  const account = async (name) => {
    const r = await request('auth/register', null, 'POST', {
      name,
      email: `${name}@example.test`,
      password: 'test-password-12345',
    });
    return { cookie: r.headers.get('set-cookie').split(';')[0], user: (await r.json()).user };
  };
  const a = await account('Author'),
    b = await account('Reader');
  const base = 'observations/alerts';
  const token = 'fixture-token-that-is-not-a-real-device';
  const register = () => request(`${base}/push/device`, b.cookie, 'PUT', { token });
  assert.equal((await register()).status, 204);
  const digest=value=>createHash('sha256').update(value).digest('hex');
  const rawSession=b.cookie.split('=')[1],sessionHash=digest(rawSession),binding=digest(sessionHash);
  const guarded={token,binding,userId:b.user.id};
  assert.equal((await request(`${base}/push/device`,b.cookie,'PUT',guarded)).status,204);
  for(const method of ['PUT','DELETE']){
    assert.equal((await request(`${base}/push/device`,b.cookie,method,{...guarded,binding:'0'.repeat(64)})).status,409);
    assert.equal((await request(`${base}/push/device`,b.cookie,method,{...guarded,userId:a.user.id})).status,409);
    assert.equal((await request(`${base}/push/device`,a.cookie,method,guarded)).status,409);
  }
  assert.equal(current.db.prepare('SELECT COUNT(*) AS n FROM push_devices').get().n,1,'stale account/session actions leave the current registration intact');
  assert.equal((await request(`${base}/push/device`, b.cookie, 'PUT', { token: 'bad' })).status, 400);
  assert.equal((await (await request(base, b.cookie)).json()).push.deviceRegistered, true);
  await request('observations/profile', b.cookie, 'PATCH', { pushAlertsEnabled: true });
  await request(`${base}/subscriptions/species/indrol2`, b.cookie, 'PUT', { enabled: true });
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'green' } })
    .jpeg()
    .toBuffer();
  const publish = async () => {
    const media = (await (await request('observations/media', a.cookie, 'POST', image, 'image/jpeg')).json())
      .media;
    const result = await request('observations', a.cookie, 'POST', {
      mediaId: media.id,
      speciesId: 'indrol2',
      hotspotId: 'L123',
      observedAt: new Date(time - 3600000).toISOString().slice(0, 16),
      notes: 'Synthetic test',
      visibility: 'public',
      hideExactLocation: true,
    });
    assert.equal(result.status, 201);
    return (await result.json()).observation;
  };
  await publish();
  await register();
  assert.equal(
    current.db.prepare('SELECT COUNT(*) AS n FROM push_deliveries').get().n,
    1,
    'reregister does not delete pending delivery',
  );
  assert.equal((await current.dispatchPush()).sent, 0);
  let delivery = current.db.prepare('SELECT * FROM push_deliveries').get();
  assert.equal(delivery.attempts, 1);
  assert.equal(delivery.status, 'pending');
  await current.dispatchPush();
  assert.equal(calls.length, 1, 'retry waits for backoff');
  mode = 'success';
  time += 60000;
  assert.equal((await current.dispatchPush()).sent, 1);
  delivery = current.db.prepare('SELECT * FROM push_deliveries').get();
  assert.equal(delivery.status, 'sent');
  assert.equal(delivery.last_code, 'provider-accepted');
  assert.equal(calls.at(-1).data.binding,binding);
  assert.equal(calls.at(-1).data.project,'fixture');
  assert.equal(calls.at(-1).android.priority,'high');
  assert.equal(Object.hasOwn(calls.at(-1),'notification'),false,'only the app data-only path may compose a generic preview');
  assert.equal(JSON.stringify(calls).includes(rawSession),false);
  assert.equal(JSON.stringify(calls).includes(sessionHash),false);
  assert.doesNotMatch(
    JSON.stringify(calls),
    /Indian Roller|Test Wetland|latitude|longitude|media|observationId/,
  );
  await current.dispatchPush();
  assert.equal(calls.length, 2, 'sent rows do not resend');
  let record = await publish();
  await request(`observations/${record.id}`, a.cookie, 'PATCH', { visibility: 'private' });
  await current.dispatchPush();
  assert.equal(calls.length, 2);
  assert.equal(
    current.db.prepare("SELECT COUNT(*) AS n FROM push_deliveries WHERE status='skipped'").get().n,
    1,
  );
  await publish();
  await request('observations/profile', b.cookie, 'PATCH', { pushAlertsEnabled: false });
  await current.dispatchPush();
  assert.equal(calls.length, 2);
  await request('observations/profile', b.cookie, 'PATCH', { pushAlertsEnabled: true });
  await publish();
  mode = 'invalid';
  await current.dispatchPush();
  assert.equal(current.db.prepare('SELECT COUNT(*) AS n FROM push_devices').get().n, 0);
  await register();
  await publish();
  let before = calls.length;
  current.db.prepare('UPDATE sessions SET expires_at=? WHERE user_id=?').run(time - 1, b.user.id);
  await current.dispatchPush();
  assert.equal(calls.length, before, 'expired session cannot receive queued push');
  current.db.prepare('UPDATE sessions SET expires_at=? WHERE user_id=?').run(time + 86400000, b.user.id);
  mode = 'failure';
  await publish();
  for (let attempt = 0; attempt < 5; attempt++) {
    await current.dispatchPush();
    time += 60000 * 2 ** attempt;
  }
  assert.equal(
    current.db.prepare("SELECT COUNT(*) AS n FROM push_deliveries WHERE status='failed' AND attempts=5").get()
      .n,
    1,
  );
  before = calls.length;
  await current.dispatchPush();
  assert.equal(calls.length, before, 'five failures stop automatic retries');
  await publish();
  await request('auth/logout', b.cookie, 'POST');
  assert.equal(
    current.db.prepare('SELECT COUNT(*) AS n FROM push_devices').get().n,
    0,
    'session deletion revokes device',
  );
  before = calls.length;
  await current.dispatchPush();
  assert.equal(calls.length, before);
  const login = await request('auth/login', null, 'POST', {
    email: 'Reader@example.test',
    password: 'test-password-12345',
  });
  b.cookie = login.headers.get('set-cookie').split(';')[0];
  await register();
  await request(`${base}/push/device`, b.cookie, 'PUT', { token: 'another-fixture-token-for-same-session' });
  await publish();
  mode = 'success';
  before = calls.length;
  onSend = async () => {
    current.db.prepare('DELETE FROM sessions WHERE user_id=?').run(b.user.id);
  };
  const [first, second] = await Promise.all([current.dispatchPush(), current.dispatchPush()]);
  assert.equal(first.sent, 1);
  assert.equal(second.sent, 0, 'overlapping timer cannot dispatch the same batch');
  assert.equal(
    calls.length,
    before + 1,
    'logout during the first send revokes the remaining device in the batch',
  );
});
