import { claimValues, findSpeciesEntities, normalizeScientificName } from './wikidata.mjs';
import { safeUrl, text } from './photos.mjs';

export class RecordingError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Accept only licensed audio explicitly linked by the exact species entity.
export function recordingFrom(page, entityId, scientificName) {
  const info = page?.imageinfo?.[0];
  if (!info || info.mediatype !== 'AUDIO' || !['audio/ogg', 'application/ogg', 'audio/mpeg', 'audio/wav', 'audio/flac'].includes(info.mime)) return null;
  if (!Number.isSafeInteger(info.size) || info.size <= 0 || info.size > 20 * 1024 * 1024) return null;
  const meta = info.extmetadata || {};
  const author = text(meta.Artist?.value);
  const license = text(meta.LicenseShortName?.value);
  const licenseUrl = safeUrl(typeof meta.LicenseUrl?.value === 'string' ? meta.LicenseUrl.value.replace(/^http:/, 'https:') : '', ['creativecommons.org'], '/');
  if (!author || !license || !licenseUrl || !/^\/(?:licenses\/(?:by|by-sa)\/(?:1\.0|2\.0|2\.5|3\.0|4\.0)|publicdomain\/zero\/1\.0)\/?$/.test(new URL(licenseUrl).pathname)) return null;
  const audioUrl = safeUrl(info.url, ['upload.wikimedia.org'], '/wikipedia/commons/');
  const sourceUrl = safeUrl(info.descriptionurl, ['commons.wikimedia.org'], '/wiki/File:');
  if (!audioUrl || !sourceUrl || typeof page.title !== 'string') return null;
  return { title: page.title, scientificName, matchedEntityId: entityId, matchUrl: `https://www.wikidata.org/wiki/${entityId}`,
    audioUrl, sourceUrl, source: 'Wikimedia Commons', mime: info.mime, author, license, licenseUrl,
    credit: text(meta.Credit?.value), attribution: text(meta.Attribution?.value), restrictions: text(meta.Restrictions?.value) };
}

export function createRecordingService({ fetchImpl = fetch, now = Date.now, ttl = 24 * 60 * 60 * 1000 } = {}) {
  const cache = new Map();
  const pending = new Map();
  const waiting = [];
  let active = 0;
  async function request(host, params) {
    const url = new URL(`https://${host}/w/api.php`);
    url.search = new URLSearchParams({ ...params, format: 'json' });
    let response;
    try { response = await fetchImpl(url, { headers: { 'User-Agent': 'BirdWanderer/0.1 (https://github.com/JinxedAsh/bird-wanderer)' }, signal: AbortSignal.timeout(8000) }); }
    catch { throw new RecordingError(503, 'Cannot reach the recording provider. Please try again.'); }
    if (!response.ok) throw new RecordingError(503, 'The recording provider is unavailable. Please try again.');
    let data;
    try { data = await response.json(); } catch { throw new RecordingError(502, 'The recording provider returned unreadable data.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.error) throw new RecordingError(502, 'The recording provider returned unsupported data.');
    return data;
  }
  async function load(name) {
    let matches;
    try { matches = await findSpeciesEntities(name, request); }
    catch (error) { if (error instanceof RecordingError) throw error; throw new RecordingError(502, 'The recording provider returned unsupported species matches.'); }
    for (const { id, entity } of matches) {
      const files = claimValues(entity, 'P51').filter((file) => typeof file === 'string' && file.trim() && file.length <= 300 && !/[|\x00-\x1f]/.test(file)).slice(0, 3);
      if (!files.length) continue;
      const data = await request('commons.wikimedia.org', { action: 'query', formatversion: '2', prop: 'imageinfo', titles: files.map((file) => `File:${file}`).join('|'), iiprop: 'url|mime|mediatype|size|extmetadata', iiextmetadatalanguage: 'en' });
      if (!Array.isArray(data.query?.pages)) throw new RecordingError(502, 'The recording provider returned unsupported files.');
      for (const file of files) {
        const page = data.query.pages.find((row) => row?.ns === 6 && typeof row.title === 'string' && row.title.replaceAll('_', ' ') === `File:${file}`.replaceAll('_', ' '));
        const recording = recordingFrom(page, id, name);
        if (recording) return recording;
      }
    }
    return null;
  }
  async function limitedLoad(name) {
    if (active >= 3) await new Promise((resolve) => waiting.push(resolve)); else active++;
    try { return await load(name); }
    finally { const next = waiting.shift(); if (next) next(); else active--; }
  }
  return {
    async recording(name) {
      if (typeof name !== 'string' || !name.trim() || name.length > 200) throw new RecordingError(400, 'A valid species scientific name is required.');
      const key = normalizeScientificName(name);
      const entry = cache.get(key);
      if (entry && now() - entry.time < ttl) return { ...entry.data, cached: true };
      if (!pending.has(key)) {
        if (pending.size >= 20) throw new RecordingError(503, 'Recording lookups are busy. Please try again.');
        pending.set(key, limitedLoad(name).then((recording) => {
          const data = { recording, fetchedAt: new Date(now()).toISOString() };
          cache.delete(key);
          if (cache.size >= 200) cache.delete(cache.keys().next().value);
          cache.set(key, { data, time: now() });
          return data;
        }).finally(() => pending.delete(key)));
      }
      return { ...await pending.get(key), cached: false };
    },
  };
}
