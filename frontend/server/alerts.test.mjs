import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from './auth.mjs';

test('sighting subscriptions deduplicate, persist read state and recheck revoked visibility without exposing GPS', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'bird-alerts-'));
  let unavailable = false;
  const options = {
    dbPath: join(directory, 'test.sqlite'),
    mediaPath: join(directory, 'media'),
    discovery: {
      catalogue: async () => {
        if (unavailable) throw Object.assign(new Error('Catalogue unavailable'), { status: 503 });
        return {
          species: [{ id: 'indrol2', name: 'Indian Roller', scientificName: 'Coracias benghalensis' }],
          hotspots: [{ id: 'L123', name: 'Test Wetland' }],
        };
      },
    },
  };
  let current = createApp(options),
    server = current.app.listen(0, '127.0.0.1');
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
    b = await account('Follower'),
    c = await account('Disabled');
  const base = 'observations/alerts';
  const state = async (cookie) => await (await request(base, cookie)).json();
  for (const person of [b, c])
    for (const [kind, id] of [
      ['species', 'indrol2'],
      ['hotspot', 'L123'],
    ])
      assert.equal(
        (await request(`${base}/subscriptions/${kind}/${id}`, person.cookie, 'PUT', { enabled: true }))
          .status,
        200,
      );
  await request('observations/profile', b.cookie, 'PATCH', { pushAlertsEnabled: true });
  await request(`observations/social/follows/${a.user.id}`, b.cookie, 'PUT', { following: true });
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'blue' } })
    .jpeg()
    .toBuffer();
  const photo = async () =>
    (await (await request('observations/media', a.cookie, 'POST', image, 'image/jpeg')).json()).media;
  const input = (media) => ({
    mediaId: media.id,
    speciesId: 'indrol2',
    hotspotId: 'L123',
    observedAt: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
    notes: 'Synthetic test only',
    visibility: 'followers',
    hideExactLocation: true,
  });
  let media = await photo();
  const body = input(media),
    posted = await request('observations', a.cookie, 'POST', body);
  assert.equal(posted.status, 201);
  const record = (await posted.json()).observation;
  let result = await state(b.cookie);
  assert.equal(result.notifications.length, 1, 'species AND hotspot create one alert');
  assert.equal(result.push.configured, false);
  assert.equal((await state(c.cookie)).notifications.length, 0, 'disabled master preference');
  assert.equal((await state(a.cookie)).notifications.length, 0, 'no self alert');
  const alert = result.notifications[0];
  assert.equal(alert.observationId, record.id);
  assert.equal(alert.isUnread, true);
  assert.doesNotMatch(JSON.stringify(result), /latitude|longitude|privateLocation|28\.5/);
  assert.equal((await request(`${base}/${alert.id}/read`, c.cookie, 'POST')).status, 404);
  await request('observations', a.cookie, 'POST', body);
  assert.equal((await state(b.cookie)).notifications.length, 1, 'publish retry cannot notify twice');
  assert.equal((await request(`${base}/${alert.id}/read`, b.cookie, 'POST')).status, 204);
  await new Promise((resolve) => server.close(resolve));
  current.db.close();
  current = createApp(options);
  server = current.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  assert.equal((await state(b.cookie)).notifications[0].isUnread, false);
  assert.equal((await state(b.cookie)).subscriptions.length, 2);
  await request('observations/profile', a.cookie, 'PATCH', { locationPrivacy: 'hide' });
  result = await state(b.cookie);
  assert.equal(result.notifications[0].hotspotId, null);
  assert.match(result.notifications[0].description, /Location withheld/);
  await request('observations/profile', a.cookie, 'PATCH', { locationPrivacy: 'private' });
  assert.equal((await state(b.cookie)).notifications.length, 0);
  assert.equal((await request(`${base}/${alert.id}/read`, b.cookie, 'POST')).status, 404);
  assert.equal((await request(`observations/media/${media.id}`, b.cookie)).status, 404);
  await request('observations/profile', a.cookie, 'PATCH', { locationPrivacy: 'approximate' });
  await request(`observations/social/follows/${a.user.id}`, b.cookie, 'PUT', { following: false });
  assert.equal((await state(b.cookie)).notifications.length, 0);
  await request(`observations/social/follows/${a.user.id}`, b.cookie, 'PUT', { following: true });
  media = await photo();
  const privateBody = { ...input(media), visibility: 'private' };
  await request('observations', a.cookie, 'POST', privateBody);
  assert.equal((await state(b.cookie)).notifications.length, 1, 'private sightings do not generate alerts');
  // A failed alert insert rolls back the new sighting; the staged image is still retryable.
  current.db.exec(
    "CREATE TRIGGER fail_alert BEFORE INSERT ON sighting_alerts BEGIN SELECT RAISE(ABORT,'fixture'); END",
  );
  media = await photo();
  const retry = input(media);
  assert.equal((await request('observations', a.cookie, 'POST', retry)).status, 500);
  assert.equal(
    current.db.prepare('SELECT COUNT(*) AS count FROM observations WHERE media_id=?').get(media.id).count,
    0,
  );
  current.db.exec('DROP TRIGGER fail_alert');
  assert.equal((await request('observations', a.cookie, 'POST', retry)).status, 201);
  assert.equal((await state(b.cookie)).notifications.length, 2);
  await request(`${base}/read`, b.cookie, 'POST');
  assert.equal(
    (await state(b.cookie)).notifications.some((n) => n.isUnread),
    false,
  );
  unavailable = true;
  assert.equal(
    (await request(`${base}/subscriptions/species/indrol2`, b.cookie, 'PUT', { enabled: false })).status,
    200,
    'unsubscribe works during provider failure',
  );
  assert.equal(
    (await request(`${base}/subscriptions/species/indrol2`, b.cookie, 'PUT', { enabled: true })).status,
    503,
  );
  assert.equal(
    (await request(`${base}/subscriptions/nope/x`, b.cookie, 'PUT', { enabled: true })).status,
    400,
  );
  assert.equal((await request(base, null)).status, 401);
  await request(`observations/${record.id}`, a.cookie, 'DELETE');
  assert.equal(
    current.db.prepare('SELECT COUNT(*) AS count FROM sighting_alerts WHERE observation_id=?').get(record.id)
      .count,
    0,
  );
});
