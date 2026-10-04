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

before(async () => {
  temporaryDirectory = mkdtempSync(join(root, '.stage1-render-'));
  const screens = {};
  const names = ['GlobalSearchScreen', 'SettingsScreen', 'SpeciesDetailScreen', 'HotspotMap', 'HotspotWeatherPanel', 'HotspotDetailScreen', 'HotspotsScreen', 'ExploreScreen', 'Header'];
  // Compile these existing TSX screens for Node rendering; no browser or new test framework.
  for (const relative of ['lib/useDialogFocus.ts', 'lib/maps.ts', 'lib/auth.ts', 'lib/discovery.ts', ...names.map((name) => `components/${name}.tsx`)]) {
    const output = join(temporaryDirectory, relative.replace(/\.tsx?$/, '.mjs'));
    mkdirSync(dirname(output), { recursive: true });
    const source = readFileSync(join(root, 'src', relative), 'utf8');
    const { code } = transformSync(source, { loader: 'tsx', format: 'esm', jsx: 'automatic', target: 'es2022' });
    writeFileSync(output, code.replace('../lib/useDialogFocus"', '../lib/useDialogFocus.mjs"').replace('../lib/maps"', '../lib/maps.mjs"').replace('./HotspotMap"', './HotspotMap.mjs"').replace('./HotspotWeatherPanel"', './HotspotWeatherPanel.mjs"').replace('./auth"', './auth.mjs"'));
  }
  for (const name of names) {
    const module = await import(pathToFileURL(join(temporaryDirectory, 'components', `${name}.mjs`)).href);
    screens[name] = module[name];
  }
  render = (name, props) => renderToStaticMarkup(createElement(screens[name], props));
  mapHelpers = await import(pathToFileURL(join(temporaryDirectory, 'lib/maps.mjs')).href);
  authClient = await import(pathToFileURL(join(temporaryDirectory, 'lib/auth.mjs')).href);
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
  const loads = [() => discoveryClient.loadDiscovery(signal), () => discoveryClient.loadSpeciesLocations('comkin1', signal), () => discoveryClient.loadHotspotDetails('L123', signal), () => discoveryClient.loadHotspotWeather('L123', signal)];
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
  assert.match(html, /Photo metadata not connected/);
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

test('unrelated people and posts do not suppress the empty search state', () => {
  const html = render('GlobalSearchScreen', {
    ...searchProps,
    posts: [{ id: 'unrelated', authorName: 'Maya Singh', authorHandle: '@maya', authorAvatar: '/maya.jpg', speciesName: 'Kingfisher', speciesScientific: 'Alcedo atthis', location: 'River', caption: 'Fishing', imageUrl: '/bird.jpg' }],
  });
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
