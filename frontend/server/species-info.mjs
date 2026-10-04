import { findSpeciesEntities, normalizeScientificName } from './wikidata.mjs';

export class SpeciesInfoError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const excerpt = (text, limit = 120) => {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const shortened = words.slice(0, limit).join(' ');
  return shortened.slice(0, 1200) + (words.length > limit || shortened.length > 1200 ? '…' : '');
};

export function articleSections(extract) {
  if (typeof extract !== 'string' || !extract.trim() || extract.length > 100000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(extract)) return null;
  const text = extract.replaceAll('\r', '');
  const headings = [...text.matchAll(/^(={2,6})\s*(.+?)\s*\1\s*$/gm)];
  const sections = headings.map((heading, index) => {
    const next = headings.slice(index + 1).find((item) => item[1].length <= heading[1].length);
    return { heading: heading[2].trim(), text: text.slice(heading.index + heading[0].length, next?.index ?? text.length).replace(/^={2,6}\s*.*?\s*={2,6}\s*$/gm, '').trim() };
  });
  const choose = (pattern) => {
    const section = sections.find((section) => pattern.test(section.heading) && section.text);
    return section ? { heading: section.heading, text: excerpt(section.text) } : null;
  };
  return {
    summary: excerpt(text.slice(0, headings[0]?.index ?? text.length), 90),
    identification: choose(/^(Description|Identification|Appearance)$/i),
    habitat: choose(/^(Habitat(?: and distribution)?|Distribution(?: and habitat)?|Range and habitat)$/i),
    behaviour: choose(/^(Behaviou?r(?: and ecology)?|Ecology and behaviou?r)$/i),
    seasonality: choose(/^(Migration|Seasonal movements|Migration and movements|Movements and migration)$/i),
  };
}

export function createSpeciesInfoService({ fetchImpl = fetch, now = Date.now, ttl = 24 * 60 * 60 * 1000 } = {}) {
  const cache = new Map();
  const pending = new Map();
  const waiting = [];
  let active = 0;
  async function request(host, params) {
    const url = new URL(`https://${host}/w/api.php`);
    url.search = new URLSearchParams({ ...params, format: 'json' }).toString();
    let response;
    try { response = await fetchImpl(url, { headers: { 'User-Agent': 'BirdWanderer/0.1 (https://github.com/JinxedAsh/bird-wanderer)' }, signal: AbortSignal.timeout(8000) }); }
    catch { throw new SpeciesInfoError(503, 'Cannot reach the species information provider. Please try again.'); }
    if (!response.ok) throw new SpeciesInfoError(503, 'Species information is unavailable. Please try again.');
    let data;
    try { data = await response.json(); } catch { throw new SpeciesInfoError(502, 'The species provider returned unreadable data.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.error) throw new SpeciesInfoError(502, 'The species provider returned an unsupported response.');
    return data;
  }
  async function load(name) {
    let matches;
    try { matches = await findSpeciesEntities(name, request); }
    catch (error) { if (error instanceof SpeciesInfoError) throw error; throw new SpeciesInfoError(502, 'The species provider returned unsupported species matches.'); }
    for (const { id, entity } of matches) {
      const title = entity.sitelinks?.enwiki?.title;
      if (typeof title !== 'string' || !title.trim() || title.length > 300 || /[|\x00-\x1f]/.test(title)) continue;
      const data = await request('en.wikipedia.org', { action: 'query', formatversion: '2', prop: 'extracts|info|pageprops', titles: title, redirects: '1', explaintext: '1', exsectionformat: 'wiki', exlimit: '1', inprop: 'url' });
      if (!Array.isArray(data.query?.pages)) throw new SpeciesInfoError(502, 'The species provider returned unsupported article data.');
      const page = data.query.pages.find((page) => page?.ns === 0 && page.pageprops?.wikibase_item === id && !Object.hasOwn(page.pageprops, 'disambiguation'));
      if (!page || typeof page.title !== 'string' || page.title.length > 300 || !Number.isSafeInteger(page.lastrevid) || page.lastrevid <= 0) continue;
      const sections = articleSections(page.extract);
      if (!sections) continue;
      const sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`;
      const revisionUrl = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&oldid=${page.lastrevid}`;
      const historyUrl = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&action=history`;
      return { ...sections, title: page.title, scientificName: name, matchedEntityId: id, matchUrl: `https://www.wikidata.org/wiki/${id}`, source: 'Wikipedia', sourceUrl, revisionUrl, historyUrl, revisionId: page.lastrevid, license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
    }
    return null;
  }
  async function limitedLoad(name) {
    if (active >= 3) await new Promise((resolve) => waiting.push(resolve)); else active++;
    try { return await load(name); }
    finally { const next = waiting.shift(); if (next) next(); else active--; }
  }
  return {
    async information(name) {
      if (typeof name !== 'string' || !name.trim() || name.length > 200) throw new SpeciesInfoError(400, 'A valid species scientific name is required.');
      const key = normalizeScientificName(name);
      const entry = cache.get(key);
      if (entry && now() - entry.time < ttl) return { ...entry.data, cached: true };
      if (!pending.has(key)) {
        if (pending.size >= 20) throw new SpeciesInfoError(503, 'Species information lookups are busy. Please try again.');
        pending.set(key, limitedLoad(name).then((profile) => {
          const data = { profile, fetchedAt: new Date(now()).toISOString() };
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
