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
const syntheticConditions = query => ({ ...query, source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/en/docs/historical-weather-api', model: 'Synthetic archive fixture estimate', matchedTime: query.observedAt.slice(0,13)+':00', timezone: 'Asia/Kolkata', timeBasis: 'Assumed local clock; exact instant unverified', fetchedAt: '2026-10-23T12:00:00Z', temperatureC: 0, windKmh: 0, precipitationMm: 0, humidityPercent: 50, cloudCoverPercent: null });
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

test('custom points and conditions persist with owner-only exact coordinates, private labels and account-bound weather', async t => {
  const f = await fixture(t, { observationWeather: { load: async query => syntheticConditions(query) } });
  const a = await f.account('MapOwner'), b = await f.account('MapReader');
  const point = { latitude: 28.56789, longitude: 77.12345, label: 'Private garden label', source: 'manual' };
  const observedAt = '2026-03-22T09:45';
  const preview = await f.request('observations/conditions', { method: 'POST', cookie: a.cookie, body: { ...point, observedAt } });
  assert.equal(preview.status, 200); const snapshot = await preview.json();
  assert.equal(snapshot.conditions.latitude, 28.6); assert.equal(snapshot.conditions.longitude, 77.1);
  const upload = async owner => (await (await f.request('observations/media', { method: 'POST', cookie: owner.cookie, body: await makeImage(), type: 'image/jpeg' })).json()).media;
  const media = await upload(a);
  const input = { mediaId: media.id, speciesId: 'indrol2', hotspotId: '', customLocation: point, observedAt, conditionsId: snapshot.conditionsId, visibility: 'public', hideExactLocation: false, notes: '' };
  const created = await f.request('observations', { method: 'POST', cookie: a.cookie, body: input }); assert.equal(created.status, 201);
  const own = (await created.json()).observation;
  assert.equal(own.hotspotId, null); assert.deepEqual(own.observationLocation, point); assert.equal(own.location, point.label); assert.equal(own.conditions.temperatureC, 0);
  assert.deepEqual(own.privateLocation, { latitude: 28.5, longitude: 77.2 });
  const read = async owner => (await (await f.request(`observations/${own.id}`, { cookie: owner.cookie })).json()).observation;
  let other = await read(b); assert.equal(other.observationLocation.latitude, 28.6); assert.equal(other.observationLocation.longitude, 77.1);
  assert.equal(other.privateLocation, undefined); assert.equal(other.observationLocation.source, 'generalized');
  assert.doesNotMatch(JSON.stringify(other), /28\.56789|77\.12345|Private garden label/);
  assert.equal((await f.request(`observations/${own.id}`, { method: 'PATCH', cookie: b.cookie, body: { notes: 'intrude' } })).status, 404);
  const search = await f.request('observations/social/search?q=Private%20garden%20label', { cookie: b.cookie }); assert.equal((await search.json()).observations.length, 0);
  const mediaB = await upload(b);
  assert.equal((await f.request('observations', { method: 'POST', cookie: b.cookie, body: { ...input, mediaId: mediaB.id } })).status, 400);
  assert.equal((await f.request('observations', { method: 'POST', cookie: a.cookie, body: input })).status, 200);
  await f.restart(); assert.deepEqual(await read(a), own);
  assert.equal((await f.request(`observations/${own.id}`, { method: 'PATCH', cookie: a.cookie, body: { visibility: 'followers' } })).status, 200);
  assert.equal((await f.request(`observations/${own.id}`, { cookie: b.cookie })).status, 404);
  assert.equal((await f.request(`observations/social/follows/${a.user.id}`, { method: 'PUT', cookie: b.cookie, body: { following: true } })).status, 200);
  assert.equal((await read(b)).observationLocation.latitude, 28.6);
  assert.doesNotMatch(JSON.stringify(await read(b)), /28\.56789|77\.12345|Private garden label/);
  const profile = await (await f.request('observations/profile', { cookie: a.cookie })).json();
  assert.equal((await f.request('observations/profile', { method: 'PATCH', cookie: a.cookie, body: { ...profile.profile, locationPrivacy: 'hide' } })).status, 200);
  other = await read(b); assert.equal(other.location, 'Location withheld'); assert.equal(other.observationLocation, null); assert.equal(other.conditions, null);
  assert.equal((await read(a)).conditions.temperatureC, 0);
  const changed = await f.request(`observations/${own.id}`, { method: 'PATCH', cookie: a.cookie, body: { observedAt: '2026-03-22T10:45' } }); assert.equal(changed.status, 200); assert.equal((await changed.json()).observation.conditions, null);
  const stale = await f.request(`observations/${own.id}`, { method: 'PATCH', cookie: a.cookie, body: { conditionsId: snapshot.conditionsId } }); assert.equal(stale.status, 400);
  const trueExif = await f.request(`observations/${own.id}`, { method: 'PATCH', cookie: a.cookie, body: { customLocation: { latitude: 28.5, longitude: 77.2, label: '', source: 'exif' }, hotspotId: '' } }); assert.equal(trueExif.status, 200);
  const switched = await f.request(`observations/${own.id}`, { method: 'PATCH', cookie: a.cookie, body: { hotspotId: 'L123', customLocation: null } }); assert.equal(switched.status, 200); assert.equal((await switched.json()).observation.hotspotId, 'L123');
});

test('hidden custom points withhold conditions under public visibility and updates clear stale weather; legacy rows remain readable', async t => {
  const f = await fixture(t, { observationWeather: { load: async query => syntheticConditions(query) } }); const a = await f.account('HiddenMap'), b = await f.account('HiddenReader');
  const point = { latitude: 0, longitude: 0, label: '', source: 'manual' }, observedAt = '2026-03-22T09:00';
  const preview = await (await f.request('observations/conditions', { method: 'POST', cookie: a.cookie, body: { ...point, observedAt } })).json();
  const media = (await (await f.request('observations/media', { method: 'POST', cookie: a.cookie, body: await makeImage(), type: 'image/jpeg' })).json()).media;
  const input = { mediaId: media.id, speciesId: 'indrol2', hotspotId: '', customLocation: point, observedAt, conditionsId: preview.conditionsId, visibility: 'public', hideExactLocation: true, notes: '' };
  assert.equal((await f.request('observations', { method: 'POST', cookie: a.cookie, body: { ...input, customLocation: { ...point, source: 'exif' } } })).status, 400);
  const created = await f.request('observations', { method: 'POST', cookie: a.cookie, body: input }); assert.equal(created.status, 201); const id = (await created.json()).observation.id;
  const other = (await (await f.request(`observations/${id}`, { cookie: b.cookie })).json()).observation;
  assert.equal(other.conditions, null); assert.equal(other.observationLocation, null);
  assert.equal((await f.request(`observations/${id}`, { method: 'PATCH', cookie: a.cookie, body: { hideExactLocation: false } })).status, 200);
  const generalized = (await (await f.request(`observations/${id}`, { cookie: b.cookie })).json()).observation;
  assert.equal(generalized.observationLocation.latitude, 0); assert.equal(generalized.conditions.temperatureC, 0); assert.equal(generalized.privateLocation, undefined);
  const changed = await f.request(`observations/${id}`, { method: 'PATCH', cookie: a.cookie, body: { customLocation: { ...point, longitude: 1, source: 'map' }, hotspotId: '' } }); assert.equal(changed.status, 200); assert.equal((await changed.json()).observation.conditions, null);
  for (const body of [{ customLocation: { ...point, latitude: 100 } }, { customLocation: point, hotspotId: 'L123' }]) assert.equal((await f.request(`observations/${id}`, { method: 'PATCH', cookie: a.cookie, body })).status, 400);
  await f.request(`observations/${id}`, { method: 'PATCH', cookie: a.cookie, body: { customLocation: null, hotspotId: 'L123' } });
  f.db.exec('DROP TABLE observation_details; DROP TABLE observation_conditions;'); await f.restart();
  const legacy = (await (await f.request(`observations/${id}`, { cookie: a.cookie })).json()).observation;
  assert.equal(legacy.hotspotId, 'L123'); assert.equal(legacy.conditions, null); assert.equal(legacy.observationLocation, null);
});

test('weather preview counts failed attempts, limits per account, then permits retry in the next window', async t => {
  let time = now, unavailable = true;
  const f = await fixture(t, { now: () => time, observationWeather: { load: async query => { if (unavailable) throw Object.assign(new Error('Synthetic provider outage'), { status: 502 }); return syntheticConditions(query); } } });
  const a = await f.account('WeatherLimits'); const body = { latitude: 0, longitude: 0, observedAt: '2026-03-22T09:00' };
  for (let i = 0; i < 20; i++) assert.equal((await f.request('observations/conditions', { method: 'POST', cookie: a.cookie, body })).status, 502);
  assert.equal((await f.request('observations/conditions', { method: 'POST', cookie: a.cookie, body })).status, 429);
  time += 60001; unavailable = false;
  assert.equal((await f.request('observations/conditions', { method: 'POST', cookie: a.cookie, body })).status, 200);
  assert.equal((await f.request('observations/conditions', { method: 'POST', body })).status, 401);
});

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
  assert.deepEqual(media.privateLocation, { latitude: 28.5, longitude: 77.2 });
  assert.equal(media.exif.capturedAt, '2026-10-23 09:00:00');
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

test('owned observation edits validate reported fields, preserve photo/EXIF and work without discovery for text/privacy',async t=>{
  let offline=false,calls=0;
  const catalogue={species:[{id:'indrol2',name:'Indian Roller',scientificName:'Coracias benghalensis'},{id:'comkin1',name:'Common Kingfisher',scientificName:'Alcedo atthis'}],hotspots:[{id:'L123',name:'Test Wetland'},{id:'L456',name:'Test Lake'}]};
  const f=await fixture(t,{discovery:{catalogue:async()=>{calls++;if(offline)throw Object.assign(new Error('Synthetic provider unavailable'),{status:503});return catalogue;}}});
  const a=await f.account('Editor'),b=await f.account('Viewer');
  const uploaded=await f.request('observations/media',{cookie:a.cookie,method:'POST',body:await makeImage(),type:'image/jpeg'});
  const media=(await uploaded.json()).media;
  const created=await f.request('observations',{cookie:a.cookie,method:'POST',body:{mediaId:media.id,speciesId:'indrol2',hotspotId:'L123',observedAt:'2026-10-23T09:00',notes:'Original',visibility:'private',hideExactLocation:true}});
  const original=(await created.json()).observation,path=`observations/${original.id}`;
  const bytesBefore=Buffer.from(await(await f.request(`observations/media/${media.id}`,{cookie:a.cookie})).arrayBuffer());
  const patch=(body,cookie=a.cookie)=>f.request(path,{cookie,method:'PATCH',body});
  assert.equal((await patch({notes:'Intrusion'},b.cookie)).status,404);
  for(const body of [{},{mediaId:media.id},{createdAt:'now'},{notes:[]},{notes:'x'.repeat(3001)},{visibility:'everyone'},{inLifeList:'yes'},{observedAt:'2026-02-30T10:00'},{observedAt:'2026-10-23T09:00Z'},{observedAt:'2100-01-01T10:00'},{observedAt:'1899-01-01T10:00'},{speciesId:''},{hotspotId:[]}])assert.equal((await patch(body)).status,400,JSON.stringify(body));
  assert.equal((await patch({speciesId:'invented'})).status,400);
  assert.equal((await patch({hotspotId:'unknown'})).status,400);
  offline=true;const before=calls;
  let response=await patch({notes:'  Revised <script>literal</script>  ',visibility:'public',observedAt:'2026-10-23T10:30',inLifeList:false});assert.equal(response.status,200);
  let result=await response.json();assert.equal(result.observation.notes,'Revised <script>literal</script>');assert.equal(result.profile.birdsCount,0);assert.equal(result.profile.photosCount,1);assert.equal(calls,before,'metadata-free edits do not call discovery');
  assert.equal((await f.request(path,{cookie:b.cookie})).status,200);assert.equal((await f.request(`observations/media/${media.id}`,{cookie:b.cookie})).status,200);
  assert.equal((await patch({speciesId:'comkin1',notes:'Must not persist on failure'})).status,503);
  assert.equal((await(await f.request(path,{cookie:a.cookie})).json()).observation.notes,'Revised <script>literal</script>');
  await patch({visibility:'followers'});assert.equal((await f.request(path,{cookie:b.cookie})).status,404);
  await f.request(`observations/social/follows/${a.user.id}`,{cookie:b.cookie,method:'PUT',body:{following:true}});
  assert.equal((await f.request(path,{cookie:b.cookie})).status,200);
  offline=false;const change={speciesId:'comkin1',hotspotId:'L456',inLifeList:true};
  assert.equal((await patch(change)).status,200);assert.equal((await patch(change)).status,200,'identical retries are safe');
  await f.restart();result=(await(await f.request(path,{cookie:a.cookie})).json()).observation;
  assert.equal(result.speciesName,'Common Kingfisher');assert.equal(result.scientificName,'Alcedo atthis');assert.equal(result.location,'Test Lake');assert.equal(result.createdAt,original.createdAt);assert.equal(result.observedAt,'2026-10-23T10:30');assert.deepEqual(result.exif,original.exif);assert.deepEqual(result.privateLocation,original.privateLocation);assert.equal(result.imageUrl,original.imageUrl);
  const bytesAfter=Buffer.from(await(await f.request(`observations/media/${media.id}`,{cookie:a.cookie})).arrayBuffer());assert.deepEqual(bytesAfter,bytesBefore);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM media').get().count,1);assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM observations').get().count,1);
});

test('source corrections remove stale alert deliveries atomically and merge only submitted fields after awaited lookup',async t=>{
  let enter,release,hold=false;
  const catalogue={species:[{id:'indrol2',name:'Indian Roller',scientificName:'Coracias benghalensis'},{id:'comkin1',name:'Common Kingfisher',scientificName:'Alcedo atthis'}],hotspots:[{id:'L123',name:'Test Wetland'},{id:'L456',name:'Test Lake'}]};
  const f=await fixture(t,{discovery:{catalogue:async()=>{if(hold){hold=false;enter();await new Promise(resolve=>{release=resolve;});}return catalogue;}},push:{webConfig:{projectId:'fixture'},vapidKey:'fixture',send:async()=>{throw new Error('Not dispatched in this fixture');}}});
  const a=await f.account('Corrector'),b=await f.account('Subscriber');
  await f.request('observations/profile',{cookie:b.cookie,method:'PATCH',body:{pushAlertsEnabled:true}});
  for(const id of ['indrol2','comkin1'])await f.request(`observations/alerts/subscriptions/species/${id}`,{cookie:b.cookie,method:'PUT',body:{enabled:true}});
  await f.request('observations/alerts/push/device',{cookie:b.cookie,method:'PUT',body:{token:'synthetic-device-token-123456789'}});
  const publish=async()=>{const media=(await(await f.request('observations/media',{cookie:a.cookie,method:'POST',body:await makeImage(),type:'image/jpeg'})).json()).media;return(await(await f.request('observations',{cookie:a.cookie,method:'POST',body:{mediaId:media.id,speciesId:'indrol2',hotspotId:'L123',observedAt:'2026-10-23T09:00',notes:'Original',visibility:'public',hideExactLocation:true}})).json()).observation;};
  const record=await publish(),path=`observations/${record.id}`;
  const patch=body=>f.request(path,{cookie:a.cookie,method:'PATCH',body});
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM sighting_alerts').get().count,1);assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM push_deliveries').get().count,1);
  f.db.exec("CREATE TRIGGER fail_correction BEFORE DELETE ON sighting_alerts BEGIN SELECT RAISE(ABORT,'fixture'); END");
  assert.equal((await patch({speciesId:'comkin1',notes:'Rollback fixture'})).status,500);
  assert.equal(f.db.prepare('SELECT species_id FROM observations WHERE id=?').get(record.id).species_id,'indrol2');assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM sighting_alerts').get().count,1);
  f.db.exec('DROP TRIGGER fail_correction');
  assert.equal((await patch({speciesId:'comkin1'})).status,200);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM sighting_alerts').get().count,0);assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM push_deliveries').get().count,0,'corrected report does not become a fresh sighting notification');
  hold=true;const entered=new Promise(resolve=>{enter=resolve;});const pending=patch({hotspotId:'L456'});await entered;
  assert.equal((await patch({notes:'Concurrent note',visibility:'private',inLifeList:false})).status,200);
  release();assert.equal((await pending).status,200);
  const current=(await(await f.request(path,{cookie:a.cookie})).json()).observation;assert.equal(current.location,'Test Lake');assert.equal(current.notes,'Concurrent note');assert.equal(current.visibility,'private');assert.equal(current.inLifeList,false);
  const second=await publish();hold=true;const deletionEntered=new Promise(resolve=>{enter=resolve;});const deleting=f.request(`observations/${second.id}`,{cookie:a.cookie,method:'PATCH',body:{speciesId:'comkin1'}});await deletionEntered;
  assert.equal((await f.request(`observations/${second.id}`,{cookie:a.cookie,method:'DELETE'})).status,204);release();assert.equal((await deleting).status,404,'record deleted during lookup does not reappear');
});
