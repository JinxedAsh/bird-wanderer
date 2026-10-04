import { Router } from 'express';

const placeholder = '/discovery-placeholder.svg';
const unavailable = 'Not available from eBird';

export class DiscoveryError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// One regional catalogue, shared by all users. No credentials or private observations
// are returned to the browser. Inject fetch/time in tests instead of contacting eBird.
export function createDiscoveryService({ apiKey = '', region = 'IN-DL', fetchImpl = fetch, now = Date.now, ttl = 15 * 60 * 1000 } = {}) {
  if (!/^[A-Z]{2}(?:-[A-Z0-9]{1,8}){0,2}$/.test(region)) throw new Error('EBIRD_REGION must be an eBird region code, for example IN-DL.');
  let cached;
  let pending;
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
    const [taxonomy, locations, observations] = await Promise.all([
      request('ref/taxonomy/ebird', { fmt: 'json', cat: 'species', locale: 'en' }),
      request(`ref/hotspot/${region}`, { fmt: 'json' }),
      request(`data/obs/${region}/recent`, { back: '14', hotspot: 'true', includeProvisional: 'false', maxResults: '10000' }),
    ]);
    const reportsBySpecies = new Map();
    const reportsByHotspot = new Map();
    for (const obs of observations) {
      if (!obs || typeof obs.speciesCode !== 'string' || !/^L\d+$/.test(obs.locId) || typeof obs.locName !== 'string' || typeof obs.obsDt !== 'string' || typeof obs.comName !== 'string' || typeof obs.sciName !== 'string') {
        throw new DiscoveryError(502, 'eBird returned unsupported observation records.');
      }
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
        species: obs.comName, scientific: obs.sciName, image: placeholder, count: Number.isFinite(obs.howMany) ? obs.howMany : null, timeAgo: obs.obsDt,
      })), photos: [], speciesList: [],
    }));
    if ((taxonomy.length && !species.length) || (locations.length && !hotspots.length)) throw new DiscoveryError(502, 'eBird returned unsupported discovery records.');
    return { species, hotspots, region, source: 'eBird', fetchedAt: new Date(now()).toISOString(), observationDays: 14 };
  }
  return {
    async catalogue() {
      if (cached && now() - cached.time < ttl) return { ...cached.data, cached: true };
      if (!pending) pending = load().then((data) => { cached = { data, time: now() }; return data; }).finally(() => { pending = undefined; });
      return { ...await pending, cached: false };
    },
  };
}

export function discoveryRouter(service) {
  const router = Router();
  router.get('/catalogue', async (_req, res, next) => {
    try { res.json(await service.catalogue()); }
    catch (error) {
      if (error instanceof DiscoveryError) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  });
  return router;
}
