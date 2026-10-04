import { Router } from 'express';
import { createWeatherService, WeatherError } from './weather.mjs';
import { createPhotoService, PhotoError } from './photos.mjs';
import { createSpeciesInfoService, SpeciesInfoError } from './species-info.mjs';

const placeholder = '/discovery-placeholder.svg';
const unavailable = 'Not available from eBird';

export class DiscoveryError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// One regional catalogue, shared by all users. No credentials or private observations
// are returned to the browser. Inject fetch/time in tests instead of contacting eBird.
export function createDiscoveryService({ apiKey = '', region = 'IN-DL', fetchImpl = fetch, now = Date.now, ttl = 15 * 60 * 1000, weather = createWeatherService(), photos = createPhotoService(), information = createSpeciesInfoService() } = {}) {
  if (!/^[A-Z]{2}(?:-[A-Z0-9]{1,8}){0,2}$/.test(region)) throw new Error('EBIRD_REGION must be an eBird region code, for example IN-DL.');
  let cached;
  let pending;
  const detailCache = new Map();
  const detailPending = new Map();
  // Detail pages use the same short cache, bounded to avoid retaining every viewed
  // species indefinitely. Failed loads are never cached and can be retried.
  async function detail(key, loadDetail) {
    const entry = detailCache.get(key);
    if (entry && now() - entry.time < ttl) return { ...entry.data, cached: true };
    if (!detailPending.has(key)) {
      detailPending.set(key, loadDetail().then((data) => {
        detailCache.delete(key);
        if (detailCache.size >= 100) detailCache.delete(detailCache.keys().next().value);
        detailCache.set(key, { data, time: now() });
        return data;
      }).finally(() => detailPending.delete(key)));
    }
    return { ...await detailPending.get(key), cached: false };
  }
  function checkReports(reports) {
    for (const obs of reports) {
      if (!obs || typeof obs.speciesCode !== 'string' || !/^L\d+$/.test(obs.locId) || typeof obs.locName !== 'string' || typeof obs.obsDt !== 'string' || typeof obs.comName !== 'string' || typeof obs.sciName !== 'string') {
        throw new DiscoveryError(502, 'eBird returned unsupported observation records.');
      }
    }
    return reports.filter((obs) => obs.locationPrivate !== true);
  }
  async function request(path, params) {
    if (!apiKey.trim()) throw new DiscoveryError(503, 'External discovery is not configured. Add an eBird API key on the server.');
    const url = new URL(`https://api.ebird.org/v2/${path}`);
    url.search = new URLSearchParams(params).toString();
    let response;
    try {
      response = await fetchImpl(url, { headers: { 'X-eBirdApiToken': apiKey.trim() }, signal: AbortSignal.timeout(10000) });
    } catch {
      throw new DiscoveryError(503, 'Cannot reach eBird. Please try again.');
    }
    if (!response.ok) {
      if ([401, 403].includes(response.status)) throw new DiscoveryError(503, 'eBird rejected the server API key. Check the discovery configuration.');
      if (response.status === 429) throw new DiscoveryError(503, 'eBird is busy. Please try again shortly.');
      throw new DiscoveryError(502, 'eBird could not supply discovery data. Please try again.');
    }
    let data;
    try { data = await response.json(); } catch { throw new DiscoveryError(502, 'eBird returned unreadable discovery data.'); }
    if (!Array.isArray(data)) throw new DiscoveryError(502, 'eBird returned an unexpected discovery response.');
    return data;
  }
  async function load() {
    const [taxonomy, locations, rawObservations] = await Promise.all([
      request('ref/taxonomy/ebird', { fmt: 'json', cat: 'species', locale: 'en' }),
      request(`ref/hotspot/${region}`, { fmt: 'json' }),
      request(`data/obs/${region}/recent`, { back: '14', hotspot: 'true', includeProvisional: 'false', maxResults: '10000' }),
    ]);
    const observations = checkReports(rawObservations);
    const reportsBySpecies = new Map();
    const reportsByHotspot = new Map();
    for (const obs of observations) {
      if (!reportsBySpecies.has(obs.speciesCode)) reportsBySpecies.set(obs.speciesCode, []);
      if (!reportsByHotspot.has(obs.locId)) reportsByHotspot.set(obs.locId, []);
      reportsBySpecies.get(obs.speciesCode).push(obs);
      reportsByHotspot.get(obs.locId).push(obs);
    }
    const species = taxonomy.filter((row) => row && row.category === 'species' && typeof row.speciesCode === 'string' && typeof row.comName === 'string' && typeof row.sciName === 'string').map((row) => ({
      id: row.speciesCode, name: row.comName, scientificName: row.sciName,
      orderFamily: row.familyComName || row.familySciName || unavailable,
      image: placeholder, source: 'eBird', sourceUrl: `https://ebird.org/species/${encodeURIComponent(row.speciesCode)}`,
      region, habitat: unavailable, habitatDetail: unavailable, bestTime: unavailable, bestTimeDetail: unavailable,
      fieldGuideNotes: unavailable, audioCallDuration: 'Unavailable', audioCallDesc: 'Recorded calls are not connected.',
      // Recent endpoint returns latest reports, not a total sightings count.
      recentObservations: (reportsBySpecies.get(row.speciesCode) || []).map((obs) => ({
        hotspotId: obs.locId, location: obs.locName, observedAt: obs.obsDt,
      })),
    }));
    const hotspots = locations.filter((row) => row && /^L\d+$/.test(row.locId) && typeof row.locName === 'string' && Number.isFinite(row.lat) && Math.abs(row.lat) <= 90 && Number.isFinite(row.lng) && Math.abs(row.lng) <= 180).map((row) => ({
      id: row.locId, name: row.locName, source: 'eBird', sourceUrl: `https://ebird.org/hotspot/${row.locId}`,
      latitude: row.lat, longitude: row.lng, speciesCount: Number.isFinite(row.numSpeciesAllTime) ? row.numSpeciesAllTime : null,
      distanceKm: null, bestTime: unavailable, imageUrl: placeholder, region,
      coordinates: `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}`, activeTodayCount: null,
      temp: unavailable, weatherCondition: unavailable, wind: unavailable, trailDifficulty: unavailable,
      recommendedGear: unavailable, openingHours: unavailable, entryFee: unavailable, cameraPass: unavailable, transitTip: unavailable,
      recentSightings: (reportsByHotspot.get(row.locId) || []).map((obs) => ({
        speciesId: obs.speciesCode,
        species: obs.comName, scientific: obs.sciName, image: placeholder, count: Number.isFinite(obs.howMany) ? obs.howMany : null, timeAgo: obs.obsDt,
      })), photos: [], speciesList: [],
    }));
    if ((taxonomy.length && !species.length) || (locations.length && !hotspots.length)) throw new DiscoveryError(502, 'eBird returned unsupported discovery records.');
    return { species, hotspots, region, source: 'eBird', fetchedAt: new Date(now()).toISOString(), observationDays: 14 };
  }
  const service = {
    async locationWeather(latitude, longitude) {
      // Round on the server too; never persist an account's device coordinates.
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new DiscoveryError(400, 'Valid location coordinates are required.');
      return weather.forecast(Number(latitude.toFixed(2)), Number(longitude.toFixed(2)));
    },
    async speciesInformation(speciesId) {
      if (!/^[a-z0-9]{3,16}$/.test(speciesId)) throw new DiscoveryError(400, 'Invalid species ID.');
      const catalogue = await service.catalogue();
      const species = catalogue.species.find((bird) => bird.id === speciesId);
      if (!species) throw new DiscoveryError(404, 'Species not found in the eBird catalogue.');
      return { ...await information.information(species.scientificName), speciesId };
    },
    async speciesPhoto(speciesId) {
      if (!/^[a-z0-9]{3,16}$/.test(speciesId)) throw new DiscoveryError(400, 'Invalid species ID.');
      const catalogue = await service.catalogue();
      const species = catalogue.species.find((bird) => bird.id === speciesId);
      if (!species) throw new DiscoveryError(404, 'Species not found in the eBird catalogue.');
      return { ...await photos.photo(species.scientificName), speciesId };
    },
    async hotspotWeather(hotspotId) {
      if (!/^L\d+$/.test(hotspotId)) throw new DiscoveryError(400, 'Invalid hotspot ID.');
      const catalogue = await service.catalogue();
      const hotspot = catalogue.hotspots.find((point) => point.id === hotspotId);
      if (!hotspot) throw new DiscoveryError(404, 'Hotspot not found in the configured region.');
      return { ...await weather.forecast(hotspot.latitude, hotspot.longitude), hotspotId };
    },
    async catalogue() {
      if (cached && now() - cached.time < ttl) return { ...cached.data, cached: true };
      if (!pending) pending = load().then((data) => { cached = { data, time: now() }; return data; }).finally(() => { pending = undefined; });
      return { ...await pending, cached: false };
    },
    async speciesLocations(speciesId) {
      if (!/^[a-z0-9]{3,16}$/.test(speciesId)) throw new DiscoveryError(400, 'Invalid species ID.');
      const catalogue = await service.catalogue();
      if (!catalogue.species.some((bird) => bird.id === speciesId)) throw new DiscoveryError(404, 'Species not found in the eBird catalogue.');
      return detail(`species:${speciesId}`, async () => {
        const reports = checkReports(await request(`data/obs/${region}/recent/${speciesId}`, { back: '14', hotspot: 'true', includeProvisional: 'false', maxResults: '10000' }));
        const knownLocations = new Map(catalogue.hotspots.map((hotspot) => [hotspot.id, hotspot]));
        if (reports.some((obs) => obs.speciesCode !== speciesId)) throw new DiscoveryError(502, 'eBird returned reports for another species.');
        const locations = reports.filter((obs) => knownLocations.has(obs.locId)).map((obs) => {
          const hotspot = knownLocations.get(obs.locId);
          return { hotspotId: hotspot.id, name: hotspot.name, coordinates: hotspot.coordinates, observedAt: obs.obsDt, count: Number.isFinite(obs.howMany) ? obs.howMany : null };
        });
        return { speciesId, locations, region, observationDays: 14, fetchedAt: new Date(now()).toISOString() };
      });
    },
    async hotspotDetails(hotspotId) {
      if (!/^L\d+$/.test(hotspotId)) throw new DiscoveryError(400, 'Invalid hotspot ID.');
      const catalogue = await service.catalogue();
      if (!catalogue.hotspots.some((hotspot) => hotspot.id === hotspotId)) throw new DiscoveryError(404, 'Hotspot not found in the configured region.');
      return detail(`hotspot:${hotspotId}`, async () => {
        const [rawReports, codes] = await Promise.all([
          request(`data/obs/${hotspotId}/recent`, { back: '14', includeProvisional: 'false', maxResults: '10000' }),
          request(`product/spplist/${hotspotId}`, {}),
        ]);
        const reports = checkReports(rawReports);
        if (reports.some((obs) => obs.locId !== hotspotId) || codes.some((code) => typeof code !== 'string')) throw new DiscoveryError(502, 'eBird returned unsupported hotspot detail records.');
        const knownSpecies = new Map(catalogue.species.map((bird) => [bird.id, bird]));
        const speciesCodes = [...new Set(codes)];
        const speciesList = speciesCodes.filter((code) => knownSpecies.has(code)).map((code) => {
          const bird = knownSpecies.get(code);
          return { speciesId: code, name: bird.name, scientific: bird.scientificName, status: 'Recorded', statusColor: 'bg-[#f1f4f9] text-[#154212]' };
        });
        return {
          hotspotId, observationDays: 14, fetchedAt: new Date(now()).toISOString(), speciesList,
          unmatchedTaxa: speciesCodes.length - speciesList.length,
          recentSightings: reports.filter((obs) => knownSpecies.has(obs.speciesCode)).map((obs) => ({ speciesId: obs.speciesCode, species: obs.comName, scientific: obs.sciName, image: placeholder, count: Number.isFinite(obs.howMany) ? obs.howMany : null, timeAgo: obs.obsDt })),
        };
      });
    },
  };
  return service;
}

export function discoveryRouter(service) {
  const router = Router();
  const send = (load) => async (req, res, next) => {
    try { res.json(await load(req)); }
    catch (error) {
      if (error instanceof DiscoveryError || error instanceof WeatherError || error instanceof PhotoError || error instanceof SpeciesInfoError) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  };
  router.get('/catalogue', send(() => service.catalogue()));
  router.post('/weather', send((req) => service.locationWeather(req.body?.latitude, req.body?.longitude)));
  router.get('/species/:speciesId/locations', send((req) => service.speciesLocations(req.params.speciesId)));
  router.get('/species/:speciesId/photo', send((req) => service.speciesPhoto(req.params.speciesId)));
  router.get('/species/:speciesId/info', send((req) => service.speciesInformation(req.params.speciesId)));
  router.get('/hotspots/:hotspotId', send((req) => service.hotspotDetails(req.params.hotspotId)));
  router.get('/hotspots/:hotspotId/weather', send((req) => service.hotspotWeather(req.params.hotspotId)));
  return router;
}
