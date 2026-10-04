import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
let temporaryDirectory;
let render;
let mapHelpers;
let authClient;
let discoveryClient;
let activityClient;
let locationHelpers;

before(async () => {
  temporaryDirectory = mkdtempSync(join(root, '.stage1-render-'));
  const screens = {};
  const names = ['GlobalSearchScreen', 'SettingsScreen', 'SpeciesDetailScreen', 'SpeciesPhoto', 'PhotoMetadata', 'PhotoPlanning', 'SpeciesInfoPanel', 'HotspotMap', 'HotspotWeatherPanel', 'HotspotDetailScreen', 'HotspotAccess', 'HotspotsScreen', 'ExploreScreen', 'LocationPicker', 'Header'];
  // Compile these existing TSX screens for Node rendering; no browser or new test framework.
  for (const relative of ['lib/useDialogFocus.ts', 'lib/maps.ts', 'lib/auth.ts', 'lib/discovery.ts', 'lib/activity.ts', 'lib/location.ts', ...names.map((name) => `components/${name}.tsx`)]) {
    const output = join(temporaryDirectory, relative.replace(/\.tsx?$/, '.mjs'));
    mkdirSync(dirname(output), { recursive: true });
    const source = readFileSync(join(root, 'src', relative), 'utf8');
    const { code } = transformSync(source, { loader: 'tsx', format: 'esm', jsx: 'automatic', target: 'es2022' });
    writeFileSync(output, code.replace('../lib/useDialogFocus"', '../lib/useDialogFocus.mjs"').replace('../lib/maps"', '../lib/maps.mjs"').replace('./HotspotMap"', './HotspotMap.mjs"').replace('./HotspotAccess"', './HotspotAccess.mjs"').replace('./HotspotWeatherPanel"', './HotspotWeatherPanel.mjs"').replace('./SpeciesPhoto"', './SpeciesPhoto.mjs"').replace('./PhotoMetadata"', './PhotoMetadata.mjs"').replace('./PhotoPlanning"', './PhotoPlanning.mjs"').replace('./SpeciesInfoPanel"', './SpeciesInfoPanel.mjs"').replace('../lib/discovery"', '../lib/discovery.mjs"').replace('../lib/auth"', '../lib/auth.mjs"').replace('./auth"', './auth.mjs"').replace('./maps"', './maps.mjs"').replace('../lib/location"', '../lib/location.mjs"'));
  }
  for (const name of names) {
    const module = await import(pathToFileURL(join(temporaryDirectory, 'components', `${name}.mjs`)).href);
    screens[name] = module[name];
    if (module.PhotoCredit) screens.PhotoCredit = module.PhotoCredit;
    if (module.SpeciesInformationContent) screens.SpeciesInformationContent = module.SpeciesInformationContent;
  }
  render = (name, props) => renderToStaticMarkup(createElement(screens[name], props));
  mapHelpers = await import(pathToFileURL(join(temporaryDirectory, 'lib/maps.mjs')).href);
  authClient = await import(pathToFileURL(join(temporaryDirectory, 'lib/auth.mjs')).href);
  locationHelpers = await import(pathToFileURL(join(temporaryDirectory, 'lib/location.mjs')).href);
  activityClient = await import(pathToFileURL(join(temporaryDirectory, 'lib/activity.mjs')).href);
  discoveryClient = await import(pathToFileURL(join(temporaryDirectory, 'lib/discovery.mjs')).href);
});

after(() => {
  // Only remove the directory created by this test, inside this workspace.
  if (temporaryDirectory && dirname(temporaryDirectory) === root.replace(/[\\/]$/, '')) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

const noop = () => {};
const searchProps = { speciesList: [], hotspots: [], posts: [], onSelectSpecies: noop, onSelectHotspot: noop, onNavigate: noop };

test('access renders sourced snapshots and missing fields, withholding overdue values and escaping text', () => {
  const access = { checkedAt: '2026-10-04', reviewOverdue: false, openingHours: { text: 'Last entry conflicts: 21:00 vs 21:30 <script>x</script>', sources: [{ label: 'Operator', url: 'https://www.sundernursery.org/timing.php' }] }, entryFee: null, cameraPass: null, approach: null };
  const html = render('HotspotAccess', { access });
  assert.match(html, /conflicts/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Not verified from a reviewed official source/);
  assert.match(html, /not a verified entrance/);
  assert.match(html, /reviewed 2026-10-04/);
  const stale = render('HotspotAccess', { access: { ...access, reviewOverdue: true } });
  assert.match(stale, /Review overdue/);
  assert.doesNotMatch(stale, /21:00/);
  assert.match(stale, /sundernursery.org/);
  assert.match(render('HotspotAccess', {}), /No reviewed access information/);
});

test('location distance preserves zero, handles the date line and rejects invalid points', () => {
  const from = { latitude: 0, longitude: 0, source: 'Manual' };
  assert.equal(locationHelpers.distanceKm(from, { latitude: 0, longitude: 0 }), 0);
  assert.ok(Math.abs(locationHelpers.distanceKm(from, { latitude: 0, longitude: 1 }) - 111.195) < 0.01);
  assert.ok(Math.abs(locationHelpers.distanceKm({ ...from, longitude: 179.9 }, { latitude: 0, longitude: -179.9 }) - 22.239) < 0.01);
  assert.equal(locationHelpers.distanceKm(from, {}), null);
  assert.equal(locationHelpers.distanceKm({ ...from, latitude: NaN }, { latitude: 0, longitude: 0 }), null);
});

test('device location requests once with finite timeout and explains permission/security failures', async () => {
  let options;
  const mock = { getCurrentPosition: (success, _error, supplied) => { options = supplied; success({ coords: { latitude: 0, longitude: 0, accuracy: 100 } }); } };
  assert.deepEqual(await locationHelpers.getDeviceLocation(mock, true), { latitude: 0, longitude: 0, source: 'GPS', accuracyM: 100 });
  assert.equal(options.timeout, 10000);
  assert.equal(options.enableHighAccuracy, false);
  await assert.rejects(locationHelpers.getDeviceLocation(mock, false), /HTTPS or localhost/);
  await assert.rejects(locationHelpers.getDeviceLocation(null, true), /does not support GPS/);
  for (const [code, message] of [[1, /denied/], [2, /unavailable/], [3, /timed out/]]) {
    await assert.rejects(locationHelpers.getDeviceLocation({ getCurrentPosition: (_success, error) => error({ code }) }, true), message);
  }
  await assert.rejects(locationHelpers.getDeviceLocation({ getCurrentPosition: (success) => success({ coords: { latitude: 91, longitude: 0 } }) }, true), /invalid coordinates/);
});

test('Explore location weather preserves zero values and distinguishes prompt, loading, errors and nearby emptiness', () => {
  const props = { observerName: 'Tester', speciesList: [], externalDiscovery: true, onNavigate: noop, onSelectSpecies: noop, onQuickLog: noop };
  assert.match(render('ExploreScreen', props), /Choose location for weather/);
  const location = { latitude: 0, longitude: 0, source: 'Manual' };
  assert.match(render('ExploreScreen', { ...props, location }), /Loading weather/);
  const weather = { current: { temperatureC: 0, windKmh: 0, condition: 'Clear', time: '2026-10-04T07:00' }, timezone: 'UTC', sourceUrl: 'https://open-meteo.com/', fetchedAt: '2026-10-04T07:00:00Z', cached: true };
  const html = render('ExploreScreen', { ...props, location, weather });
  for (const value of ['0°C', '0 km/h', 'Open-Meteo', 'CC BY 4.0', 'Approximate point forecast', 'Reports within 50 km', 'Coverage is limited', 'cached']) assert.ok(html.includes(value), value);
  assert.match(render('ExploreScreen', { ...props, location, weatherError: 'Provider unavailable', onRetryWeather: noop }), /Retry Explore weather/);
  const picker = render('LocationPicker', { location, onSelect: noop, onClose: noop });
  assert.match(picker, /Use device location/);
  assert.match(picker, /Location latitude/);
  assert.match(picker, /Clear location and return to region/);
});

test('nearby hotspots filter the list and map consistently, retain zero distance and order closest first', () => {
  const hotspot = (id, name, distanceKm) => ({ id, name, source: 'eBird', latitude: 28, longitude: 77, distanceKm, region: 'IN-DL', trailDifficulty: 'Unavailable', speciesCount: 20, activeTodayCount: null, imageUrl: '/test.svg' });
  const html = render('HotspotsScreen', { hotspots: [hotspot('L3', 'Faraway', 50.01), hotspot('L2', 'Second closest', 5), hotspot('L1', 'At selected point', 0)], nearbyEnabled: true, externalDiscovery: true, onChooseLocation: noop, onSelectHotspot: noop, onNavigate: noop, showToast: noop });
  assert.doesNotMatch(html, /Faraway/);
  assert.ok(html.indexOf('At selected point') < html.indexOf('Second closest'));
  assert.match(html, /0.0 km/);
  assert.match(html, /Nearby \(50 km\)/);
});

test('location weather client rounds coordinates and keeps them out of the URL, validating response identity', async () => {
  const previous = globalThis.fetch;
  let sent;
  try {
    globalThis.fetch = async (url, options) => { sent = { url, ...options }; return Response.json({ latitude: 28.55, longitude: 77.22, source: 'Open-Meteo', current: {}, days: [], hourly: [] }); };
    await discoveryClient.loadLocationWeather(28.55123, 77.22123, new AbortController().signal);
    assert.equal(sent.url, '/api/discovery/weather');
    assert.equal(sent.method, 'POST');
    assert.deepEqual(JSON.parse(sent.body), { latitude: 28.55, longitude: 77.22 });
    globalThis.fetch = async () => Response.json({ latitude: 0, longitude: 0, source: 'Open-Meteo', current: {}, days: [], hourly: [] });
    await assert.rejects(discoveryClient.loadLocationWeather(28.55, 77.22, new AbortController().signal), /Unexpected location weather/);
  } finally { globalThis.fetch = previous; }
});

test('search uses supplied real history with safe text and no fabricated recent searches', () => {
  const empty = render('GlobalSearchScreen', { ...searchProps, externalDiscovery: true, onRecordSearch: noop });
  assert.doesNotMatch(empty, /Recent Searches|value="Roller"|Okhla Sanctuary/);
  assert.match(empty, /Saved birds only/);
  assert.match(empty, /Press Enter/);
  const html = render('GlobalSearchScreen', { ...searchProps, recentSearches: ['Wetland', '<script>bad</script>'], historyDisabled: true });
  assert.match(html, /Remove Wetland from recent searches/);
  assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /disabled=""/);
});

test('persisted species bookmark is controlled by the account state and can disable mutation', () => {
  const props = { species: { id: 'indrol2', source: 'eBird', name: 'Indian Roller', scientificName: 'Coracias benghalensis', image: '/test.svg' }, onNavigate: noop, onQuickLog: noop, showToast: noop, onToggleBookmark: noop };
  assert.match(render('SpeciesDetailScreen', { ...props, saved: true, saveDisabled: true }), /disabled="" aria-pressed="true" aria-label="Bookmark species"/);
  assert.match(render('SpeciesDetailScreen', { ...props, saved: false }), /aria-pressed="false" aria-label="Bookmark species"/);
});

test('activity client preserves session semantics, validates responses and sends explicit mutations', async () => {
  const previous = globalThis.fetch;
  const signal = new AbortController().signal;
  const state = { saves: [{ kind: 'species', id: 'indrol2' }], searches: ['Roller'] };
  const requests = [];
  try {
    globalThis.fetch = async (url, options) => { requests.push({ url, ...options }); return Response.json(state); };
    assert.deepEqual(await activityClient.activity.load(signal), state);
    await activityClient.activity.save('species', 'indrol2', true, signal);
    await activityClient.activity.search('Roller', signal);
    await activityClient.activity.removeSearch('Roller', signal);
    await activityClient.activity.removeSearch(undefined, signal);
    assert.deepEqual(requests.map((req) => req.method), ['GET', 'PUT', 'POST', 'DELETE', 'DELETE']);
    assert.equal(requests[1].url, '/api/activity/saves/species/indrol2');
    assert.deepEqual(JSON.parse(requests[1].body), { saved: true });
    assert.deepEqual(JSON.parse(requests[4].body), {});
    assert.ok(requests.every((req) => req.signal === signal && req.credentials === 'same-origin'));
    for (const invalid of [null, {}, { ...state, saves: [null] }, { ...state, saves: [{ kind: 'post', id: 'indrol2' }] }, { ...state, searches: Array(11).fill('Bird') }, { ...state, searches: ['bad\nterm'] }]) {
      globalThis.fetch = async () => Response.json(invalid);
      await assert.rejects(activityClient.activity.load(signal), /Unexpected saved-items response/);
    }
    globalThis.fetch = async () => Response.json({ error: 'Sign in' }, { status: 401 });
    await assert.rejects(activityClient.activity.load(signal), authClient.SessionExpiredError);
    globalThis.fetch = async () => Response.json({ error: 'Provider unavailable' }, { status: 503 });
    await assert.rejects(activityClient.activity.save('species', 'indrol2', true, signal), (error) => !(error instanceof authClient.SessionExpiredError) && error.message === 'Provider unavailable');
    globalThis.fetch = async () => { throw new TypeError('Offline'); };
    await assert.rejects(activityClient.activity.load(signal), /Check your connection/);
  } finally { globalThis.fetch = previous; }
});

test('species information renders credited excerpts, missing sections, loading and retry without local timing claims', () => {
  const profile = { title: 'Indian roller', scientificName: 'Coracias benghalensis', summary: 'A bird of a broad range.', identification: { heading: 'Description', text: 'Blue wings <img onerror=steal()>' }, habitat: { heading: 'Habitat', text: 'Open woodland' }, behaviour: null, seasonality: null, source: 'Wikipedia', sourceUrl: 'https://en.wikipedia.org/wiki/Indian_roller', revisionUrl: 'https://en.wikipedia.org/w/index.php?oldid=123', historyUrl: 'https://en.wikipedia.org/w/index.php?action=history', revisionId: 123, matchUrl: 'https://www.wikidata.org/wiki/Q477133', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
  const data = { speciesId: 'indrol2', profile, fetchedAt: '2026-10-04T12:00:00Z', cached: true };
  const html = render('SpeciesInformationContent', { data });
  for (const value of ['Open woodland', 'No supported source section', 'Wikipedia contributors', 'Author history', 'CC BY-SA 4.0', 'General species-range', 'not a local sighting forecast', 'cached']) assert.ok(html.includes(value), value);
  assert.match(html, /&lt;img onerror=steal\(\)&gt;/);
  assert.doesNotMatch(html, /<img onerror|Best month:|Difficulty: Medium/);
  assert.match(render('SpeciesInformationContent', {}), /Loading sourced species information/);
  assert.match(render('SpeciesInformationContent', { error: 'Provider unavailable', onRetry: noop }), /Retry species information/);
  assert.match(render('SpeciesInformationContent', { data: { ...data, profile: null } }), /No matching species article/);
  const panel = render('SpeciesInfoPanel', { speciesId: 'indrol2' });
  assert.match(panel, /<details id="species-information"/);
  assert.doesNotMatch(panel, /open=""/);
});

test('species information client validates identity and section shape including a genuine no-match', async () => {
  const previous = globalThis.fetch;
  const profile = { title: 'Bird', scientificName: 'Test species', summary: 'Summary', identification: null, habitat: null, behaviour: null, seasonality: null, source: 'Wikipedia', sourceUrl: 'https://en.wikipedia.org/wiki/Bird', revisionUrl: 'https://en.wikipedia.org/w/index.php?oldid=123', historyUrl: 'https://en.wikipedia.org/w/index.php?action=history', revisionId: 123, matchUrl: 'https://www.wikidata.org/wiki/Q1', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
  const signal = new AbortController().signal;
  try {
    globalThis.fetch = async () => Response.json({ speciesId: 'indrol2', profile });
    assert.equal((await discoveryClient.loadSpeciesInformation('indrol2', signal)).profile.summary, 'Summary');
    for (const invalid of [{ ...profile, habitat: { text: 42 } }, { ...profile, revisionId: null }, { ...profile, source: 'Unknown' }]) {
      globalThis.fetch = async () => Response.json({ speciesId: 'indrol2', profile: invalid });
      await assert.rejects(discoveryClient.loadSpeciesInformation('indrol2', signal), /Unexpected species information/);
    }
    globalThis.fetch = async () => Response.json({ speciesId: 'wrong', profile });
    await assert.rejects(discoveryClient.loadSpeciesInformation('indrol2', signal), /Unexpected species information/);
    globalThis.fetch = async () => Response.json({ speciesId: 'indrol2', profile: null });
    assert.equal((await discoveryClient.loadSpeciesInformation('indrol2', signal)).profile, null);
  } finally { globalThis.fetch = previous; }
});

test('photo planning uses the current reference, separates general rules and never infers trip timing from EXIF', () => {
  const exif = { status: 'available', cameraMake: 'Canon', cameraModel: 'Canon Camera', lens: 'EF100-400mm', exposureSeconds: 0.0025, aperture: 9, iso: 200, focalLengthMm: 400, capturedAt: '2014-10-25 11:02:12', utcOffset: null };
  const photo = { sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kingfisher.jpg', exif };
  const props = { speciesId: 'comkin1', state: { speciesId: 'comkin1', photo, loading: false, error: '' }, onChooseHotspot: noop };
  const html = render('PhotoPlanning', props);
  for (const text of ['1/400 s', 'f/9', 'ISO 200', '400 mm', 'EF100-400mm', photo.sourceUrl, 'One reference photo', 'not a minimum lens requirement', 'General technique guidance', 'Choose a reported hotspot', 'Trip saving is not connected', 'opening hours', 'camera permissions']) assert.ok(html.includes(text), text);
  assert.match(html, /may be too slow for fast flight/);
  assert.doesNotMatch(html, /2014-10-25|11:02:12|400mm\+ recommended|Best Time:|Optimal settings|Verified Field Shot/);
  const faster = render('PhotoPlanning', { ...props, state: { ...props.state, photo: { ...photo, exif: { ...exif, exposureSeconds: 0.0005 } } } });
  assert.match(faster, /uses a short exposure/);
  assert.doesNotMatch(faster, /may be too slow for fast flight/);
});

test('photo planning remains useful with loading, failed, missing and partial evidence without leaking a previous species', () => {
  const exif = { status: 'available', cameraMake: null, cameraModel: null, lens: null, exposureSeconds: null, aperture: null, iso: null, focalLengthMm: 145, capturedAt: null, utcOffset: null };
  const photo = { sourceUrl: 'https://commons.wikimedia.org/wiki/File:Duck.jpg', exif };
  const props = { speciesId: 'duck', state: { speciesId: 'duck', photo, loading: false, error: '' }, onChooseHotspot: noop };
  const partial = render('PhotoPlanning', props);
  assert.match(partial, /145 mm/);
  assert.doesNotMatch(partial, /f\/5.6|1\/500|ISO 400|reference exposure/);
  for (const state of [{ ...props.state, speciesId: 'previous' }, { ...props.state, loading: true }]) {
    const html = render('PhotoPlanning', { ...props, state });
    assert.match(html, /Loading this species/);
    assert.doesNotMatch(html, /145 mm|Duck.jpg/);
  }
  const missing = render('PhotoPlanning', { ...props, state: { ...props.state, photo: null } });
  assert.match(missing, /No exposure or focal-length evidence/);
  assert.match(missing, /General technique guidance/);
  assert.doesNotMatch(missing, /ISO 400|1\/500|145 mm/);
  const failed = render('PhotoPlanning', { ...props, state: { ...props.state, photo: null, error: 'Provider unavailable' } });
  assert.match(failed, /Use Retry photo above/);
  assert.match(failed, /Choose a reported hotspot/);
});

test('photo credit retains author/licence/source and escapes supplied markup without inventing sighting or EXIF evidence', () => {
  const photo = { title: 'File:Roller.jpg', author: '<img src=x onerror=alert(1)>', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Roller.jpg', matchUrl: 'https://www.wikidata.org/wiki/Q123', credit: 'Original creator', attribution: 'Required attribution', usageTerms: 'Creative Commons', restrictions: 'Source notice' };
  const html = render('PhotoCredit', { photo, full: true });
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
  for (const text of ['CC BY-SA 4.0', photo.licenseUrl, photo.sourceUrl, 'Original creator', 'Required attribution', 'Source notice', 'Cropped to fit', 'not evidence of a recent sighting']) assert.ok(html.includes(text), text);
  const bird = { id: 'indrol2', name: 'Indian Roller', scientificName: 'Coracias benghalensis', source: 'eBird', image: '/discovery-placeholder.svg' };
  const fallback = render('SpeciesPhoto', { species: bird, hero: true, frameClassName: 'photo-frame' });
  assert.match(fallback, /Loading photo: Indian Roller/);
  assert.match(fallback, /Loading species photograph/);
  assert.doesNotMatch(fallback, /Verified Field Shot|1\/2500/);
});

test('reference EXIF renders recorded units, partial missing fields and a timezone disclaimer without recommendations', () => {
  const exif = { status: 'available', cameraMake: 'NIKON CORPORATION', cameraModel: 'NIKON D300', lens: null, exposureSeconds: 0.002, aperture: 8, iso: 400, focalLengthMm: 390, capturedAt: '2011-10-11 09:27:38', utcOffset: null };
  const html = render('PhotoMetadata', { exif });
  for (const value of ['Reference Photo EXIF', 'NIKON D300', '1/500 s', 'f/8', '400', '390 mm', '2011-10-11 09:27:38', 'timezone unknown', 'Unavailable', 'not independently verified or recommended settings']) assert.ok(html.includes(value), value);
  assert.doesNotMatch(html, /GPS|Verified Field Shot|Best time|recommended lens/);
  const longExposure = render('PhotoMetadata', { exif: { ...exif, exposureSeconds: 2.5, utcOffset: '+05:30', cameraModel: '<script>steal()</script>' } });
  assert.match(longExposure, /2.5 s/);
  assert.match(longExposure, /UTC\+05:30/);
  assert.match(longExposure, /&lt;script&gt;/);
  assert.doesNotMatch(longExposure, /<script>/);
  const decimalExposure = render('PhotoMetadata', { exif: { ...exif, exposureSeconds: 0.3 } });
  assert.match(decimalExposure, /0.3 s/);
  assert.doesNotMatch(decimalExposure, /1\/3 s/);
  const missing = render('PhotoMetadata', { exif: { ...exif, status: 'unavailable' } });
  assert.match(missing, /absent, stripped or unreadable/);
  assert.doesNotMatch(missing, /NIKON|1\/500/);
});

test('photo client accepts normalized EXIF and rejects malformed metadata or a mismatched species', async () => {
  const previous = globalThis.fetch;
  const exif = { status: 'available', cameraMake: null, cameraModel: 'Camera', lens: null, exposureSeconds: 0.002, aperture: null, iso: null, focalLengthMm: null, capturedAt: null, utcOffset: null };
  const photo = { source: 'Wikimedia Commons', thumbnailUrl: 'https://thumb.wikimedia.org/wikipedia/commons/test.jpg', author: 'Creator', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', exif };
  try {
    globalThis.fetch = async () => Response.json({ speciesId: 'indrol2', photo });
    assert.equal((await discoveryClient.loadSpeciesPhoto('indrol2', new AbortController().signal)).photo.exif.cameraModel, 'Camera');
    for (const invalid of [null, { ...exif, iso: '400' }, { ...exif, exposureSeconds: -1 }, { ...exif, status: 'verified' }]) {
      globalThis.fetch = async () => Response.json({ speciesId: 'indrol2', photo: { ...photo, exif: invalid } });
      await assert.rejects(discoveryClient.loadSpeciesPhoto('indrol2', new AbortController().signal), /Unexpected species photo metadata/);
    }
    globalThis.fetch = async () => Response.json({ speciesId: 'comkin1', photo });
    await assert.rejects(discoveryClient.loadSpeciesPhoto('indrol2', new AbortController().signal), /Unexpected species photo response/);
    globalThis.fetch = async () => Response.json({ speciesId: 'indrol2', photo: null });
    assert.equal((await discoveryClient.loadSpeciesPhoto('indrol2', new AbortController().signal)).photo, null);
  } finally { globalThis.fetch = previous; }
});

test('hotspot weather presents sourced forecasts, genuine zeros, missing values, loading and retry states', () => {
  const weather = { source: 'Open-Meteo', timezone: 'Asia/Kolkata', fetchedAt: '2026-10-04T01:00:00Z', cached: true,
    current: { time: '2026-10-04T07:15', temperatureC: 0, windKmh: 25, humidityPercent: null, precipitationMm: 1, cloudCoverPercent: 90, condition: 'Rain' },
    days: [{ date: '2026-10-04', sunrise: '2026-10-04T06:14', sunset: null }],
    hourly: [{ time: '2026-10-04T08:00', temperatureC: 0, rainProbability: 0, windKmh: null }] };
  assert.match(render('HotspotWeatherPanel', {}), /Loading hotspot weather/);
  const error = render('HotspotWeatherPanel', { error: 'Weather unavailable', onRetry: noop });
  assert.match(error, /Retry weather/);
  assert.doesNotMatch(error, /Loading hotspot weather/);
  const html = render('HotspotWeatherPanel', { weather });
  for (const text of ['Asia/Kolkata', '0°C', '0%', 'Unavailable', '06:14', 'Open-Meteo', 'CC BY 4.0', 'Wind is elevated', 'pack a rain cover', 'raise ISO', 'general planning rules', 'not calculated golden-hour boundaries']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Mist burns|Ideal for perched birds|Golden hour ends/);
});

test('protected discovery rejects ended sessions distinctly from provider/network failures and incorrect passwords', async () => {
  const previousFetch = globalThis.fetch;
  const signal = new AbortController().signal;
  const loads = [() => discoveryClient.loadDiscovery(signal), () => discoveryClient.loadSpeciesLocations('comkin1', signal), () => discoveryClient.loadHotspotDetails('L123', signal), () => discoveryClient.loadHotspotWeather('L123', signal), () => discoveryClient.loadSpeciesPhoto('comkin1', signal), () => discoveryClient.loadSpeciesInformation('comkin1', signal)];
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Sign in required.' }), { status: 401 });
    for (const load of loads) await assert.rejects(load, authClient.SessionExpiredError);
    assert.equal(await authClient.auth.me(), null);
    await assert.rejects(() => authClient.auth.login('test@example.test', 'wrong'), (error) => !(error instanceof authClient.SessionExpiredError));
    globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Provider unavailable.' }), { status: 503 });
    for (const load of loads) await assert.rejects(load, (error) => !(error instanceof authClient.SessionExpiredError) && error.message === 'Provider unavailable.');
    globalThis.fetch = async () => { throw new TypeError('Network offline'); };
    for (const load of loads) await assert.rejects(load, (error) => !(error instanceof authClient.SessionExpiredError) && /Check your connection/.test(error.message));
  } finally { globalThis.fetch = previousFetch; }
});

test('map coordinates accept genuine zero values and reject missing, non-finite and out-of-range values', () => {
  assert.deepEqual(mapHelpers.hotspotCoordinates({ latitude: 0, longitude: 0 }), [0, 0]);
  assert.deepEqual(mapHelpers.hotspotCoordinates({ latitude: -90, longitude: 180 }), [-90, 180]);
  for (const point of [{}, { latitude: 28.5 }, { latitude: NaN, longitude: 77 }, { latitude: 28, longitude: Infinity }, { latitude: 91, longitude: 77 }, { latitude: 28, longitude: -181 }, { latitude: '28.5', longitude: 77 }]) {
    assert.equal(mapHelpers.hotspotCoordinates(point), null);
    assert.equal(mapHelpers.hotspotDirectionsUrl(point), null);
  }
});

test('directions encode the selected hotspot coordinates without confusing lat/lng or including keys', () => {
  const url = new URL(mapHelpers.hotspotDirectionsUrl({ latitude: 28.567, longitude: 77.311 }));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('destination'), '28.567,77.311');
  assert.equal(url.searchParams.has('key'), false);
  assert.equal(url.searchParams.has('origin'), false);
});

test('real map area and directions use source coordinates; missing coordinates provide an honest fallback', () => {
  const hotspot = { id: 'L123', name: 'Test Wetland', source: 'eBird', latitude: 28.567, longitude: 77.311, coordinates: '28.567, 77.311', imageUrl: '/discovery-placeholder.svg', recentSightings: [], photos: [], speciesList: [] };
  const props = { hotspot, onNavigate: noop, onToggleSave: noop, onSelectSpeciesByName: noop, showToast: noop };
  const detail = render('HotspotDetailScreen', props);
  assert.match(detail, /aria-label="Map of Test Wetland"/);
  assert.match(detail, /destination=28.567%2C77.311/);
  assert.match(detail, /Open directions/);
  const missing = render('HotspotDetailScreen', { ...props, hotspot: { ...hotspot, latitude: undefined } });
  assert.match(missing, /Directions unavailable/);
  assert.doesNotMatch(missing, /google.com\/maps\/dir/);
  const list = render('HotspotsScreen', { hotspots: [hotspot], externalDiscovery: true, onSelectHotspot: noop, onNavigate: noop, showToast: noop });
  assert.match(list, /aria-label="Map of filtered eBird hotspots"/);
  assert.doesNotMatch(list, /Delhi Map View|Sultanpur/);
  assert.match(render('HotspotMap', { hotspots: [], label: 'Empty map' }), /No valid hotspot coordinates/);
});

test('external species details show genuine reports without fabricated photos, conservation status or map locations', () => {
  const html = render('SpeciesDetailScreen', {
    species: { id: 'indrol2', name: 'Indian Roller', scientificName: 'Coracias benghalensis', source: 'eBird', sourceUrl: 'https://ebird.org/species/indrol2', image: '/discovery-placeholder.svg', habitat: 'Not available from eBird', habitatDetail: 'Not available from eBird', bestTime: 'Not available from eBird', bestTimeDetail: 'Not available from eBird', fieldGuideNotes: 'Not available from eBird', audioCallDuration: 'Unavailable', recentObservations: [{ hotspotId: 'L123', location: 'Test Wetland', observedAt: '2026-10-04 07:15' }] },
    onNavigate: noop, onQuickLog: noop, showToast: noop,
    locations: { speciesId: 'indrol2', locations: [{ hotspotId: 'L123', name: 'Test Wetland', coordinates: '28.5, 77.2', observedAt: '2026-10-04 07:15', count: 3 }], fetchedAt: '2026-10-04T00:00:00Z', cached: false }, onSelectHotspotById: noop,
  });
  assert.match(html, /Test Wetland/);
  assert.match(html, /aria-label="Open hotspot Test Wetland"/);
  assert.match(html, /Status unavailable/);
  assert.match(html, /Loading photo metadata/);
  assert.doesNotMatch(html, /Verified Field Shot|1\/2500|32 uploads|Okhla|Yamuna Bio-Diversity/);
});

test('external hotspot and search distinguish all-time species totals from unavailable daily activity and distance', () => {
  const hotspot = { id: 'L123', name: 'Roller Wetland', source: 'eBird', sourceUrl: 'https://ebird.org/hotspot/L123', region: 'IN-DL', coordinates: '28.5, 77.2', imageUrl: '/discovery-placeholder.svg', speciesCount: 0, activeTodayCount: null, distanceKm: null, recentSightings: [], photos: [], speciesList: [] };
  const html = render('HotspotDetailScreen', { hotspot, onToggleSave: noop, onNavigate: noop, onSelectSpeciesByName: noop, showToast: noop });
  assert.match(html, /Species recorded all time \(0\)/);
  assert.match(html, /Unavailable/);
  assert.doesNotMatch(html, /06:00|06:14|68%|Wetland Hotspot|Barrage Watchtower/);
  const search = render('GlobalSearchScreen', { ...searchProps, hotspots: [hotspot] });
  assert.match(search, /0 species recorded all time/);
  assert.match(search, /Distance unavailable/);
  assert.doesNotMatch(search, /species active today/);
  const list = render('HotspotsScreen', { hotspots: [hotspot], externalDiscovery: true, onSelectHotspot: noop, onNavigate: noop, showToast: noop });
  assert.match(list, /Roller Wetland/);
  assert.doesNotMatch(list, /Delhi Map View|Sultanpur|Yamuna/);
});

test('external explore works with an empty catalogue and does not show sample weather or notable reports', () => {
  const html = render('ExploreScreen', { observerName: 'Test Birder', speciesList: [], externalDiscovery: true, discoveryRegion: 'IN-DL', onSelectSpecies: noop, onNavigate: noop, onQuickLog: noop });
  assert.match(html, /No recent species reports loaded/);
  assert.doesNotMatch(html, /24°C|8 km\/h|Seen 2h ago|14 nearby/);
});

test('species location loading, retry and empty states remain distinct from real reports', () => {
  const props = { species: { id: 'comkin1', name: 'Common Kingfisher', scientificName: 'Alcedo atthis', source: 'eBird', image: '/discovery-placeholder.svg' }, onNavigate: noop, onQuickLog: noop, showToast: noop };
  assert.match(render('SpeciesDetailScreen', props), /Loading locations for Common Kingfisher/);
  const failed = render('SpeciesDetailScreen', { ...props, locationsError: 'Provider unavailable', onRetryLocations: noop });
  assert.match(failed, /Provider unavailable/);
  assert.match(failed, /Try again/);
  assert.doesNotMatch(failed, /Loading locations/);
  const empty = render('SpeciesDetailScreen', { ...props, locations: { speciesId: 'comkin1', locations: [], fetchedAt: '2026-10-04T00:00:00Z', cached: true } });
  assert.match(empty, /No recent reports at hotspots/);
  assert.doesNotMatch(empty, /Loading locations|Okhla|Yamuna Bio-Diversity/);
});

test('hotspot detail displays its own reports and never reuses regional reports during loading or failure', () => {
  const hotspot = { id: 'L123', name: 'Test Wetland', source: 'eBird', imageUrl: '/discovery-placeholder.svg', recentSightings: [{ species: 'Wrong Regional Bird', scientific: 'Wrong scientific', image: '/test.svg', count: 5, timeAgo: 'Yesterday' }], photos: [], speciesList: [] };
  const props = { hotspot, onNavigate: noop, onToggleSave: noop, onSelectSpeciesByName: noop, onSelectSpeciesById: noop, showToast: noop };
  const loading = render('HotspotDetailScreen', props);
  assert.match(loading, /Loading hotspot reports/);
  assert.doesNotMatch(loading, /Wrong Regional Bird/);
  const failed = render('HotspotDetailScreen', { ...props, detailsError: 'Provider unavailable', onRetryDetails: noop });
  assert.match(failed, /Try again/);
  assert.doesNotMatch(failed, /Wrong Regional Bird/);
  const loaded = render('HotspotDetailScreen', { ...props, details: { hotspotId: 'L123', recentSightings: [{ speciesId: 'comkin1', species: 'Common Kingfisher', scientific: 'Alcedo atthis', image: '/test.svg', count: 0, timeAgo: '2026-10-04 07:15' }], speciesList: [], unmatchedTaxa: 0, fetchedAt: '2026-10-04T00:00:00Z', cached: false } });
  assert.match(loaded, /Common Kingfisher/);
  assert.match(loaded, /0 individuals/);
  assert.match(loaded, /role="button" tabindex="0"/);
  assert.doesNotMatch(loaded, /Wrong Regional Bird/);
});

test('search renders its only matching hotspot and every matching bird', () => {
  const html = render('GlobalSearchScreen', {
    ...searchProps,
    speciesList: [
      { id: 'roller-a', name: 'First Roller', scientificName: 'First scientific name', image: '/first.jpg', sightingsThisWeek: 0 },
      { id: 'roller-b', name: 'Second Roller', scientificName: 'Second scientific name', image: '/second.jpg', sightingsThisWeek: 3 },
    ],
    hotspots: [{ id: 'only', name: 'Roller Wetland', region: 'Test region', distanceKm: 2, activeTodayCount: 0 }],
  });
  assert.match(html, /First Roller/);
  assert.match(html, /Second Roller/);
  assert.match(html, /Roller Wetland/);
  assert.match(html, /0 local sightings this week/);
  assert.match(html, /0 species active today/);
});

test('an empty catalogue and no matching community records show the empty search state', () => {
  const html = render('GlobalSearchScreen', searchProps);
  assert.match(html, /No wanderings found/);
  assert.doesNotMatch(html, /Maya Singh/);
  assert.doesNotMatch(html, /src="\/bird.jpg"/);
});

test('species details preserve a genuine zero sightings count', () => {
  const html = render('SpeciesDetailScreen', {
    species: { id: 'zero', name: 'Test Bird', scientificName: 'Test scientific name', image: '/test.jpg', sightingsThisWeek: 0 },
    onNavigate: noop, onQuickLog: noop, showToast: noop,
  });
  assert.match(html, />0<\/span>/);
});

test('settings and header display the supplied account identity', () => {
  const userProfile = { name: 'Test Observer', avatarUrl: '/observer.jpg', locationPrivacy: 'approximate', profileVisibility: 'public' };
  const html = render('SettingsScreen', { email: 'observer@example.test', userProfile, onUpdateProfile: noop, onLogout: noop, onNavigate: noop, showToast: noop });
  assert.match(html, /observer@example.test/);
  assert.doesNotMatch(html, /sourabh@wanderer.in/);
  const header = render('Header', { currentScreen: 'explore', userProfile, onNavigate: noop, onBack: noop, showToast: noop });
  assert.match(header, /alt="Test Observer profile"/);
  assert.match(header, /src="\/observer.jpg"/);
});
