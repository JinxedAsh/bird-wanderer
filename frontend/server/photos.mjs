export class PhotoError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const userAgent = 'BirdWanderer/0.1 (https://github.com/JinxedAsh/bird-wanderer)';
const normalizeName = (name) => name.trim().replace(/\s+/g, ' ').toLowerCase();
const claims = (entity, property) => (Array.isArray(entity.claims?.[property]) ? entity.claims[property] : [])
  .filter((claim) => claim && claim.rank !== 'deprecated' && claim.mainsnak?.snaktype === 'value')
  .sort((a, b) => Number(b.rank === 'preferred') - Number(a.rank === 'preferred'))
  .map((claim) => claim.mainsnak.datavalue?.value);

// Commons attribution fields contain HTML. Return text only; React renders it
// as text, never executable markup. Preserve author/credit instead of truncating.
function text(value) {
  if (typeof value !== 'string' || value.length > 12000) return '';
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
      if (entity[0] !== '#') return entities[entity.toLowerCase()] || match;
      const number = Number.parseInt(entity.slice(entity[1].toLowerCase() === 'x' ? 2 : 1), entity[1].toLowerCase() === 'x' ? 16 : 10);
      return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff) ? String.fromCodePoint(number) : '';
    }).replace(/\s+/g, ' ').trim();
}

function safeUrl(value, hosts, pathPrefix) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !hosts.includes(url.hostname) || url.username || url.password || url.port || !url.pathname.startsWith(pathPrefix)) return null;
    return url.toString();
  } catch { return null; }
}

function photoFrom(page, entityId, scientificName) {
  const info = page.imageinfo?.[0];
  if (!info || info.mediatype !== 'BITMAP' || !['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) return null;
  const meta = info.extmetadata || {};
  const author = text(meta.Artist?.value);
  const license = text(meta.LicenseShortName?.value);
  const rawLicenseUrl = typeof meta.LicenseUrl?.value === 'string' ? meta.LicenseUrl.value.replace(/^http:/, 'https:') : '';
  const licenseUrl = safeUrl(rawLicenseUrl, ['creativecommons.org'], '/');
  if (!author || !license || !licenseUrl) return null;
  const licensePath = new URL(licenseUrl).pathname;
  if (!/^\/licenses\/(by|by-sa)\/(1\.0|2\.0|2\.5|3\.0|4\.0)\/?$/.test(licensePath) && !/^\/publicdomain\/zero\/1\.0\/?$/.test(licensePath)) return null;
  const thumbnailUrl = safeUrl(info.thumburl, ['upload.wikimedia.org', 'thumb.wikimedia.org'], '/wikipedia/commons/');
  const originalUrl = safeUrl(info.url, ['upload.wikimedia.org'], '/wikipedia/commons/');
  const sourceUrl = safeUrl(info.descriptionurl, ['commons.wikimedia.org'], '/wiki/File:');
  if (!thumbnailUrl || !originalUrl || !sourceUrl || typeof page.title !== 'string') return null;
  return { title: page.title, author, credit: text(meta.Credit?.value), attribution: text(meta.Attribution?.value),
    usageTerms: text(meta.UsageTerms?.value), restrictions: text(meta.Restrictions?.value), license, licenseUrl,
    thumbnailUrl, originalUrl, sourceUrl, source: 'Wikimedia Commons', mime: info.mime,
    scientificName, matchedEntityId: entityId, matchUrl: `https://www.wikidata.org/wiki/${entityId}` };
}

// Load only requested species. Cache successful/no-match results; never let
// image discovery delay the eBird catalogue or substitute an unverified image.
export function createPhotoService({ fetchImpl = fetch, now = Date.now, ttl = 24 * 60 * 60 * 1000 } = {}) {
  const cache = new Map();
  const pending = new Map();
  const waiting = [];
  let active = 0;
  async function request(host, params) {
    const url = new URL(`https://${host}/w/api.php`);
    url.search = new URLSearchParams({ ...params, format: 'json' }).toString();
    let response;
    try { response = await fetchImpl(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(8000) }); }
    catch { throw new PhotoError(503, 'Cannot reach the photo provider. Please try again.'); }
    if (!response.ok) throw new PhotoError(503, 'The photo provider is unavailable. Please try again.');
    let data;
    try { data = await response.json(); }
    catch { throw new PhotoError(502, 'The photo provider returned unreadable data.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.error) throw new PhotoError(502, 'The photo provider returned an unsupported response.');
    return data;
  }
  async function load(scientificName) {
    const search = await request('www.wikidata.org', { action: 'wbsearchentities', search: scientificName, language: 'en', limit: '5' });
    if (!Array.isArray(search.search)) throw new PhotoError(502, 'The photo provider returned unsupported species matches.');
    const ids = search.search.map((item) => item?.id).filter((id) => typeof id === 'string' && /^Q\d+$/.test(id)).slice(0, 5);
    if (!ids.length) return null;
    const entities = await request('www.wikidata.org', { action: 'wbgetentities', ids: ids.join('|'), props: 'claims' });
    if (!entities.entities || typeof entities.entities !== 'object') throw new PhotoError(502, 'The photo provider returned unsupported species details.');
    for (const id of ids) {
      const entity = entities.entities[id];
      if (!entity || !claims(entity, 'P225').some((name) => typeof name === 'string' && normalizeName(name) === normalizeName(scientificName)) || !claims(entity, 'P105').some((rank) => rank?.id === 'Q7432')) continue;
      const files = claims(entity, 'P18').filter((file) => typeof file === 'string' && file.length <= 300 && !file.includes('|')).slice(0, 3);
      if (!files.length) continue;
      const data = await request('commons.wikimedia.org', { action: 'query', formatversion: '2', prop: 'imageinfo', titles: files.map((file) => `File:${file}`).join('|'),
        iiprop: 'url|extmetadata|mime|mediatype', iiurlwidth: '960', iiextmetadatalanguage: 'en',
        iiextmetadatafilter: 'Artist|Credit|Attribution|LicenseShortName|LicenseUrl|UsageTerms|Restrictions' });
      if (!Array.isArray(data.query?.pages)) throw new PhotoError(502, 'The photo provider returned unsupported file details.');
      // Retain Wikidata preference order; Commons may return pages in another order.
      for (const file of files) {
        const page = data.query.pages.find((page) => typeof page?.title === 'string' && page.title.replaceAll('_', ' ') === `File:${file}`.replaceAll('_', ' '));
        const photo = page && photoFrom(page, id, scientificName);
        if (photo) return photo;
      }
    }
    return null;
  }
  async function limitedLoad(name) {
    if (active >= 3) await new Promise((resolve) => waiting.push(resolve));
    else active++;
    try { return await load(name); }
    finally { const next = waiting.shift(); if (next) next(); else active--; }
  }
  return {
    async photo(scientificName) {
      if (typeof scientificName !== 'string' || !scientificName.trim() || scientificName.length > 200) throw new PhotoError(400, 'A valid species scientific name is required.');
      const key = normalizeName(scientificName);
      const entry = cache.get(key);
      if (entry && now() - entry.time < ttl) return { ...entry.data, cached: true };
      if (!pending.has(key)) {
        if (pending.size >= 30) throw new PhotoError(503, 'Photo lookups are busy. Please try again.');
        pending.set(key, limitedLoad(scientificName).then((photo) => {
          const data = { photo, fetchedAt: new Date(now()).toISOString() };
          cache.delete(key);
          if (cache.size >= 300) cache.delete(cache.keys().next().value);
          cache.set(key, { data, time: now() });
          return data;
        }).finally(() => pending.delete(key)));
      }
      return { ...await pending.get(key), cached: false };
    },
  };
}
