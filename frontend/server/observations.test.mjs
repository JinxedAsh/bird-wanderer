import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { request as httpRequest } from 'node:http';
import { createApp } from './auth.mjs';

const discovery = {
  catalogue: async () => ({
    species: [{ id: 'indrol2', name: 'Indian Roller', scientificName: 'Coracias benghalensis' }],
    hotspots: [{ id: 'L123', name: 'Test Wetland' }],
  }),
};
const now = Date.parse('2026-10-23T12:00:00Z');
const makeImage = () =>
  sharp({ create: { width: 8, height: 8, channels: 3, background: '#245a27' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'Fixture maker', Model: 'Fixture camera' },
      IFD2: { ISOSpeedRatings: '400', DateTimeOriginal: '2026:10:23 09:00:00' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '28/1 30/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '77/1 12/1 0/1',
      },
    })
    .toBuffer();

async function fixture(t, extra = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'bird-observation-'));
  const options = {
    dbPath: join(directory, 'test.sqlite'),
    mediaPath: join(directory, 'media'),
    discovery,
    now: () => now,
    ...extra,
  };
  let current = createApp(options),
    server = current.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const request = async (path, { cookie, body, method = 'GET', type } = {}) =>
    fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
      method,
      headers: {
        Origin: 'http://localhost:3000',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body !== undefined ? { 'Content-Type': type || 'application/json' } : {}),
      },
      body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
    });
  const account = async (name) => {
    const response = await request('auth/register', {
      method: 'POST',
      body: { name, email: `${name}@example.test`, password: 'test-password-12345' },
    });
    assert.equal(response.status, 201);
    return { cookie: response.headers.get('set-cookie').split(';')[0], user: (await response.json()).user };
  };
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    current.db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    request,
    account,
    directory,
    get db() {
      return current.db;
    },
    get server() {
      return server;
    },
    async restart() {
      await new Promise((resolve) => server.close(resolve));
      current.db.close();
      current = createApp(options);
      server = current.app.listen(0, '127.0.0.1');
      await new Promise((resolve) => server.once('listening', resolve));
    },
  };
}

test('upload, private observation, journal/profile and media survive restart; other accounts cannot read or mutate', async (t) => {
  const f = await fixture(t),
    a = await f.account('Owner'),
    b = await f.account('Other');
  const bytes = await makeImage();
  assert.equal(
    (await f.request('observations/media', { method: 'POST', body: bytes, type: 'image/jpeg' })).status,
    401,
  );
  const uploaded = await f.request('observations/media', {
    method: 'POST',
    cookie: a.cookie,
    body: bytes,
    type: 'image/jpeg',
  });
  assert.equal(uploaded.status, 201);
  const media = (await uploaded.json()).media;
  assert.equal(media.exif.cameraMake, 'Fixture maker');
  assert.equal(media.hasPrivateLocation, true);
  const mediaPath = `observations/media/${media.id}`;
  const image = await f.request(mediaPath, { cookie: a.cookie });
  assert.equal(image.status, 200);
  assert.match(image.headers.get('cache-control'), /no-store/);
  assert.equal((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).exif, undefined);
  assert.equal((await f.request(mediaPath, { cookie: b.cookie })).status, 404);
  const body = {
    mediaId: media.id,
    speciesId: 'indrol2',
    hotspotId: 'L123',
    observedAt: '2026-10-23T09:00',
    notes: 'Field note',
    visibility: 'private',
    hideExactLocation: true,
  };
  assert.equal((await f.request('observations', { method: 'POST', cookie: b.cookie, body })).status, 409);
  assert.equal(
    (
      await f.request('observations', {
        method: 'POST',
        cookie: a.cookie,
        body: { ...body, speciesId: 'not-a-bird' },
      })
    ).status,
    400,
  );
  const created = await f.request('observations', { method: 'POST', cookie: a.cookie, body });
  assert.equal(created.status, 201);
  const record = (await created.json()).observation;
  assert.equal(
    (await (await f.request('observations?scope=feed', { cookie: a.cookie })).json()).observations.length,
    0,
  );
  assert.equal(record.privateLocation.latitude, 28.5);
  assert.equal((await f.request('observations', { method: 'POST', cookie: a.cookie, body })).status, 200);
  assert.equal(
    (
      await f.request('observations', {
        method: 'POST',
        cookie: a.cookie,
        body: { ...body, hideExactLocation: false },
      })
    ).status,
    409,
  );
  for (const path of [`observations/${record.id}`, mediaPath])
    assert.equal((await f.request(path, { cookie: b.cookie })).status, 404);
  assert.equal(
    (await f.request(`observations/${record.id}`, { method: 'DELETE', cookie: b.cookie })).status,
    404,
  );
  assert.equal(
    (
      await f.request(`observations/${record.id}`, {
        method: 'PATCH',
        cookie: b.cookie,
        body: { visibility: 'public' },
      })
    ).status,
    404,
  );
  assert.equal(
    (await (await f.request('observations?scope=feed', { cookie: b.cookie })).json()).observations.length,
    0,
  );
  await f.request('observations/profile', {
    method: 'PATCH',
    cookie: a.cookie,
    body: { name: 'Updated Owner', bio: 'A real profile', primaryRig: 'My camera' },
  });
  await f.restart();
  const restored = await (await f.request('observations', { cookie: a.cookie })).json();
  assert.equal(restored.observations.length, 1);
  assert.equal(restored.profile.name, 'Updated Owner');
  assert.equal(restored.profile.photosCount, 1);
  assert.equal(restored.observations[0].exif.cameraModel, 'Fixture camera');
  const patched = await f.request(`observations/${record.id}`, {
    method: 'PATCH',
    cookie: a.cookie,
    body: { visibility: 'public', inLifeList: false },
  });
  assert.equal(patched.status, 200);
  const shared = await (await f.request(`observations/${record.id}`, { cookie: b.cookie })).json();
  assert.equal(Object.hasOwn(shared.observation, 'privateLocation'), false);
  assert.equal(shared.observation.location, 'Test Wetland');
  assert.equal((await f.request(mediaPath, { cookie: b.cookie })).status, 200);
  await f.request('observations/profile', {
    method: 'PATCH',
    cookie: a.cookie,
    body: { locationPrivacy: 'hide' },
  });
  assert.equal(
    (await (await f.request(`observations/${record.id}`, { cookie: b.cookie })).json()).observation.location,
    'Location withheld',
  );
  await f.request('observations/profile', {
    method: 'PATCH',
    cookie: a.cookie,
    body: { locationPrivacy: 'private' },
  });
  assert.equal((await f.request(`observations/${record.id}`, { cookie: b.cookie })).status, 404);
  assert.equal((await f.request(mediaPath, { cookie: b.cookie })).status, 404);
  assert.equal(
    (await (await f.request('observations?scope=feed', { cookie: b.cookie })).json()).observations.length,
    0,
  );
  await f.request('observations/profile', {
    method: 'PATCH',
    cookie: a.cookie,
    body: { locationPrivacy: 'approximate' },
  });
  await f.request(`observations/${record.id}`, {
    method: 'PATCH',
    cookie: a.cookie,
    body: { visibility: 'followers' },
  });
  assert.equal((await f.request(mediaPath, { cookie: b.cookie })).status, 404);
  f.db.prepare('INSERT INTO follows VALUES (?,?)').run(b.user.id, a.user.id);
  assert.equal((await f.request(mediaPath, { cookie: b.cookie })).status, 200);
  await f.request(`observations/${record.id}`, { method: 'DELETE', cookie: a.cookie });
  assert.equal((await f.request(mediaPath, { cookie: a.cookie })).status, 404);
  assert.equal(readdirSync(join(f.directory, 'media')).length, 0);
});

test('upload validates real content/size, handles missing EXIF, and cleans files when database persistence fails', async (t) => {
  const f = await fixture(t),
    a = await f.account('Upload');
  for (const [body, type, status] of [
    [Buffer.from('not a photo'), 'image/jpeg', 415],
    [Buffer.from([255, 216, 255, 0]), 'image/jpeg', 422],
    [await makeImage(), 'image/png', 415],
    [Buffer.alloc(10 * 1024 * 1024 + 1), 'image/jpeg', 413],
  ]) {
    assert.equal(
      (await f.request('observations/media', { method: 'POST', cookie: a.cookie, body, type })).status,
      status,
    );
  }
  const clean = await sharp({ create: { width: 5, height: 5, channels: 3, background: 'white' } })
    .png()
    .toBuffer();
  const response = await f.request('observations/media', {
    method: 'POST',
    cookie: a.cookie,
    body: clean,
    type: 'image/png',
  });
  assert.equal(response.status, 201);
  const media = (await response.json()).media;
  assert.equal(media.exif.status, 'unavailable');
  assert.equal(
    (await f.request(`observations/media/${media.id}`, { method: 'DELETE', cookie: a.cookie })).status,
    204,
  );
  f.db.exec(
    "CREATE TRIGGER reject_media BEFORE INSERT ON media BEGIN SELECT RAISE(ABORT,'fixture persistence failure'); END;",
  );
  assert.equal(
    (
      await f.request('observations/media', {
        method: 'POST',
        cookie: a.cookie,
        body: clean,
        type: 'image/png',
      })
    ).status,
    500,
  );
  assert.equal(readdirSync(join(f.directory, 'media')).length, 0);
});

test(
  'disconnected uploads keep processing slots until decoder completion, then release without staged files',
  { timeout: 10000 },
  async (t) => {
    let release,
      entered,
      calls = 0;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const bothEntered = new Promise((resolve) => {
      entered = resolve;
    });
    t.after(() => release());
    const clean = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'green' } })
      .jpeg()
      .toBuffer();
    const f = await fixture(t, {
      imageProcessor: async () => {
        calls++;
        if (calls === 2) entered();
        await gate;
        return clean;
      },
    });
    const a = await f.account('Concurrent');
    let closed = 0,
      serverClosed;
    const closedUploads = new Promise((resolve) => {
      serverClosed = resolve;
    });
    f.server.on('request', (req, res) => {
      if ((req.originalUrl || req.url) === '/api/observations/media')
        res.once('close', () => {
          closed++;
          if (closed === 2) serverClosed();
        });
    });
    const send = () => {
      const req = httpRequest({
        hostname: '127.0.0.1',
        port: f.server.address().port,
        path: '/api/observations/media',
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3000',
          Cookie: a.cookie,
          'Content-Type': 'image/jpeg',
          'Content-Length': clean.length,
        },
      });
      req.on('error', () => {});
      req.end(clean);
      return req;
    };
    const first = send(),
      second = send();
    await bothEntered;
    first.destroy();
    second.destroy();
    await closedUploads;
    assert.equal(
      (
        await f.request('observations/media', {
          method: 'POST',
          cookie: a.cookie,
          body: clean,
          type: 'image/jpeg',
        })
      ).status,
      503,
    );
    assert.equal(calls, 2);
    release();
    await f.request('health');
    assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM media').get().count, 0);
    assert.equal(
      (
        await f.request('observations/media', {
          method: 'POST',
          cookie: a.cookie,
          body: clean,
          type: 'image/jpeg',
        })
      ).status,
      201,
    );
  },
);
