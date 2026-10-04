import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDiscoveryService } from './discovery.mjs';
import { createApp } from './auth.mjs';

const taxonomy = [
  { speciesCode: 'indrol2', comName: 'Indian Roller', sciName: 'Coracias benghalensis', category: 'species', familyComName: 'Rollers' },
  { speciesCode: 'comkin1', comName: 'Common Kingfisher', sciName: 'Alcedo atthis', category: 'species' },
];
const locations = [{ locId: 'L123', locName: 'Test Wetland', lat: 28.5, lng: 77.2, numSpeciesAllTime: 42 }];
const observations = [{ speciesCode: 'indrol2', comName: 'Indian Roller', sciName: 'Coracias benghalensis', locId: 'L123', locName: 'Test Wetland', obsDt: '2026-10-04 07:15', howMany: 3 }];
function upstream(calls) {
  return async (url, options) => {
    calls.push({ url: String(url), options });
    const data = url.pathname.includes('taxonomy') ? taxonomy : url.pathname.includes('hotspot') ? locations : observations;
    return Response.json(data);
  };
}

test('external catalogue keeps source IDs, joins reports and never invents missing metadata or sighting totals', async () => {
  const calls = [];
  const service = createDiscoveryService({ apiKey: 'test-key', fetchImpl: upstream(calls), now: () => 1000 });
  const data = await service.catalogue();
  assert.equal(data.species[0].id, 'indrol2');
  assert.equal(data.species[0].source, 'eBird');
  assert.equal(data.species[0].recentObservations[0].hotspotId, 'L123');
  assert.equal(data.species[0].sightingsThisWeek, undefined);
  assert.equal(data.species[0].iucnStatus, undefined);
  assert.equal(data.species[1].recentObservations.length, 0);
  assert.equal(data.hotspots[0].speciesCount, 42);
  assert.equal(data.hotspots[0].recentSightings[0].count, 3);
  assert.equal(data.hotspots[0].distanceKm, null);
  assert.equal(data.hotspots[0].activeTodayCount, null);
  assert.equal(data.hotspots[0].openingHours, 'Not available from eBird');
  assert.equal(JSON.stringify(data).includes('test-key'), false);
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.equal(call.options.headers['X-eBirdApiToken'], 'test-key');
    assert.equal(new URL(call.url).origin, 'https://api.ebird.org');
    assert.equal(call.url.includes('test-key'), false);
    assert.ok(call.options.signal);
  }
  const obsUrl = new URL(calls.find((c) => c.url.includes('/data/obs/')).url);
  assert.equal(obsUrl.searchParams.get('hotspot'), 'true');
  assert.equal(obsUrl.searchParams.get('includeProvisional'), 'false');
});

test('concurrent requests share fetches; cache expires and refreshes without changing retrieval time', async () => {
  const calls = [];
  let time = 1000;
  const service = createDiscoveryService({ apiKey: 'test-key', fetchImpl: upstream(calls), now: () => time, ttl: 100 });
  const [first, second] = await Promise.all([service.catalogue(), service.catalogue()]);
  assert.equal(calls.length, 3);
  assert.equal(first.fetchedAt, second.fetchedAt);
  time += 50;
  const cached = await service.catalogue();
  assert.equal(cached.cached, true);
  assert.equal(cached.fetchedAt, first.fetchedAt);
  time += 100;
  const refreshed = await service.catalogue();
  assert.equal(calls.length, 6);
  assert.notEqual(refreshed.fetchedAt, first.fetchedAt);
});

test('missing key, upstream errors, malformed payloads and failures are safe and retryable', async () => {
  assert.throws(() => createDiscoveryService({ region: '../other' }), /EBIRD_REGION/);
  await assert.rejects(createDiscoveryService().catalogue(), { status: 503 });
  for (const status of [401, 403, 429, 500]) {
    const service = createDiscoveryService({ apiKey: 'test-key', fetchImpl: async () => new Response('private upstream details', { status }) });
    await assert.rejects(service.catalogue(), (error) => error.status >= 500 && !error.message.includes('private upstream'));
  }
  for (const data of [{ wrong: true }, [null]]) {
    await assert.rejects(createDiscoveryService({ apiKey: 'test-key', fetchImpl: async () => Response.json(data) }).catalogue(), { status: 502 });
  }
  await assert.rejects(createDiscoveryService({ apiKey: 'test-key', fetchImpl: async () => new Response('invalid JSON') }).catalogue(), { status: 502 });
  let failing = true;
  const service = createDiscoveryService({ apiKey: 'test-key', fetchImpl: async (url, options) => {
    if (failing) throw new Error('network secret');
    return upstream([])(url, options);
  } });
  await assert.rejects(service.catalogue(), { status: 503 });
  failing = false;
  assert.equal((await service.catalogue()).species.length, 2);
  const empty = await createDiscoveryService({ apiKey: 'test-key', fetchImpl: async () => Response.json([]) }).catalogue();
  assert.deepEqual(empty.hotspots, []);
});

test('discovery API requires a valid session and reports setup errors without breaking authentication', async () => {
  const { app, db } = createApp();
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${url}/api/discovery/catalogue`)).status, 401);
    const registered = await fetch(`${url}/api/auth/register`, { method: 'POST', headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test Birder', email: 'discovery@example.test', password: 'test-password-12345' }) });
    assert.equal(registered.status, 201);
    const cookie = registered.headers.get('set-cookie').split(';')[0];
    const response = await fetch(`${url}/api/discovery/catalogue`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /not configured/);
    assert.equal((await fetch(`${url}/api/auth/me`, { headers: { Cookie: cookie } })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

function detailUpstream(calls, detailOverride) {
  return async (url, options) => {
    calls.push(String(url));
    if (detailOverride) {
      const override = detailOverride(url);
      if (override !== undefined) return Response.json(override);
    }
    if (url.pathname.includes('/product/spplist/')) return Response.json(['comkin1', 'indrol2', 'unknown-taxon', 'indrol2']);
    if (url.pathname.includes('/recent/indrol2')) return Response.json([
      ...observations,
      { ...observations[0], locId: 'L456', locName: 'Another Wetland', howMany: undefined },
      { ...observations[0], locId: 'L999', locName: 'Unknown location' },
      { ...observations[0], locationPrivate: true, locName: 'Private report' },
    ]);
    if (url.pathname.includes('/data/obs/L123/recent')) return Response.json([{ ...observations[0], speciesCode: 'comkin1', comName: 'Common Kingfisher', sciName: 'Alcedo atthis', howMany: 0 }]);
    if (url.pathname.includes('/ref/hotspot/')) return Response.json([...locations, { ...locations[0], locId: 'L456', locName: 'Another Wetland' }]);
    return upstream([])(url, options);
  };
}

test('species-specific discovery links multiple known hotspots and excludes unknown/private locations', async () => {
  const calls = [];
  const service = createDiscoveryService({ apiKey: 'test-key', fetchImpl: detailUpstream(calls) });
  const result = await service.speciesLocations('indrol2');
  assert.deepEqual(result.locations.map((location) => location.hotspotId), ['L123', 'L456']);
  assert.equal(result.locations[1].count, null);
  assert.equal(JSON.stringify(result).includes('Private report'), false);
  const url = new URL(calls.find((call) => call.includes('/recent/indrol2')));
  assert.equal(url.searchParams.get('hotspot'), 'true');
  assert.equal(url.searchParams.get('includeProvisional'), 'false');
});

test('hotspot details use location-specific reports and join the all-time species list by stable IDs', async () => {
  const service = createDiscoveryService({ apiKey: 'test-key', fetchImpl: detailUpstream([]) });
  const result = await service.hotspotDetails('L123');
  assert.equal(result.hotspotId, 'L123');
  assert.equal(result.recentSightings[0].speciesId, 'comkin1');
  assert.equal(result.recentSightings[0].count, 0);
  assert.deepEqual(result.speciesList.map((bird) => bird.speciesId), ['comkin1', 'indrol2']);
  assert.equal(result.unmatchedTaxa, 1);
  assert.ok(result.speciesList.every((bird) => bird.status === 'Recorded'));
});

test('detail IDs are validated against the configured catalogue before querying provider details', async () => {
  const calls = [];
  const service = createDiscoveryService({ apiKey: 'test-key', fetchImpl: detailUpstream(calls) });
  await assert.rejects(service.speciesLocations('../secret'), { status: 400 });
  await assert.rejects(service.hotspotDetails('L123?other=1'), { status: 400 });
  assert.equal(calls.length, 0);
  await assert.rejects(service.speciesLocations('unknown'), { status: 404 });
  await assert.rejects(service.hotspotDetails('L999'), { status: 404 });
  assert.equal(calls.length, 3);
});

test('detail caches share loads, expire, and retry failures without mixing entities', async () => {
  const calls = [];
  let time = 1000;
  const service = createDiscoveryService({ apiKey: 'test-key', fetchImpl: detailUpstream(calls), now: () => time, ttl: 100 });
  const [one, two] = await Promise.all([service.speciesLocations('indrol2'), service.speciesLocations('indrol2')]);
  assert.equal(one.fetchedAt, two.fetchedAt);
  assert.equal(calls.filter((url) => url.includes('/recent/indrol2')).length, 1);
  assert.equal((await service.speciesLocations('indrol2')).cached, true);
  await service.hotspotDetails('L123');
  assert.equal((await service.hotspotDetails('L123')).hotspotId, 'L123');
  time += 101;
  assert.equal((await service.speciesLocations('indrol2')).cached, false);
  assert.equal(calls.filter((url) => url.includes('/recent/indrol2')).length, 2);
  let invalid = true;
  const retry = createDiscoveryService({ apiKey: 'test-key', fetchImpl: detailUpstream([], (url) => url.pathname.includes('/recent/indrol2') && invalid ? [{ ...observations[0], speciesCode: 'wrong' }] : undefined) });
  await assert.rejects(retry.speciesLocations('indrol2'), { status: 502 });
  invalid = false;
  assert.equal((await retry.speciesLocations('indrol2')).locations.length, 2);
  const malformed = createDiscoveryService({ apiKey: 'test-key', fetchImpl: detailUpstream([], (url) => url.pathname.includes('/product/spplist/') ? [null] : undefined) });
  await assert.rejects(malformed.hotspotDetails('L123'), { status: 502 });
  const wrongLocation = createDiscoveryService({ apiKey: 'test-key', fetchImpl: detailUpstream([], (url) => url.pathname.includes('/data/obs/L123/') ? [{ ...observations[0], locId: 'L456' }] : undefined) });
  await assert.rejects(wrongLocation.hotspotDetails('L123'), { status: 502 });
});

test('detail HTTP routes keep session protection and expose ID-safe species/hotspot responses', async () => {
  const weatherCalls = [];
  const { app, db } = createApp({ discovery: createDiscoveryService({ apiKey: 'test-key', fetchImpl: detailUpstream([]), weather: { forecast: async (...coordinates) => { weatherCalls.push(coordinates); return { source: 'Open-Meteo' }; } } }) });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    assert.equal((await fetch(`${base}/discovery/hotspots/L123`)).status, 401);
    assert.equal((await fetch(`${base}/discovery/species/indrol2/locations`)).status, 401);
    assert.equal((await fetch(`${base}/discovery/hotspots/L123/weather`)).status, 401);
    assert.equal(weatherCalls.length, 0);
    const registration = await fetch(`${base}/auth/register`, { method: 'POST', headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test Observer', email: 'journey@example.test', password: 'test-password-12345' }) });
    const headers = { Cookie: registration.headers.get('set-cookie').split(';')[0] };
    const species = await fetch(`${base}/discovery/species/indrol2/locations`, { headers });
    assert.equal(species.status, 200);
    assert.equal((await species.json()).speciesId, 'indrol2');
    const hotspot = await fetch(`${base}/discovery/hotspots/L123`, { headers });
    assert.equal(hotspot.status, 200);
    assert.equal((await hotspot.json()).recentSightings[0].speciesId, 'comkin1');
    assert.equal((await fetch(`${base}/discovery/hotspots/L999`, { headers })).status, 404);
    const weather = await fetch(`${base}/discovery/hotspots/L123/weather`, { headers });
    assert.equal(weather.status, 200);
    assert.equal((await weather.json()).hotspotId, 'L123');
    assert.deepEqual(weatherCalls, [[28.5, 77.2]]);
    assert.equal((await fetch(`${base}/discovery/hotspots/L999/weather`, { headers })).status, 404);
    assert.equal((await fetch(`${base}/discovery/hotspots/not-an-id/weather`, { headers })).status, 400);
    assert.equal(weatherCalls.length, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
