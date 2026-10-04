import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleSections, createSpeciesInfoService } from './species-info.mjs';

const statement = (value) => ({ mainsnak: { snaktype: 'value', datavalue: { value } } });
const entity = (name = 'Coracias benghalensis') => ({ claims: { P225: [statement(name)], P105: [statement({ id: 'Q7432' })] }, sitelinks: { enwiki: { title: 'Indian roller' } } });
const extract = 'A bird native to a broad range.\n\n== Description ==\nBrown breast and bright blue wings.\n=== Variation ===\nSex and age can differ.\n== Distribution and habitat ==\nOpen woodland and grassland.\n== Behaviour and ecology ==\nPerches before feeding.\n=== Feeding ===\nFeeds on insects.\n== Migration ==\nSome populations move seasonally.\n== References ==\nNot a bird description.';
const page = () => ({ title: 'Indian roller', ns: 0, lastrevid: 12345, pageprops: { wikibase_item: 'Q2' }, extract });
function upstream(calls = [], override = () => undefined) {
  return async (url, options) => {
    calls.push({ url, options });
    const custom = override(url);
    if (custom !== undefined) return Response.json(custom);
    if (url.searchParams.get('action') === 'wbsearchentities') return Response.json({ search: [{ id: 'Q1' }, { id: 'Q2' }] });
    if (url.searchParams.get('action') === 'wbgetentities') return Response.json({ entities: { Q1: entity('Coracias benghalensis indicus'), Q2: entity() } });
    return Response.json({ query: { pages: [page()] } });
  };
}

test('species information requires exact taxonomy and article identity, with revision/author/licence provenance', async () => {
  const calls = [];
  const result = await createSpeciesInfoService({ fetchImpl: upstream(calls), now: () => 1000 }).information('Coracias benghalensis');
  assert.equal(result.profile.matchedEntityId, 'Q2');
  assert.equal(result.profile.habitat.text, 'Open woodland and grassland.');
  assert.match(result.profile.identification.text, /Sex and age/);
  assert.match(result.profile.behaviour.text, /Feeds on insects/);
  assert.equal(result.profile.seasonality.heading, 'Migration');
  assert.match(result.profile.revisionUrl, /oldid=12345/);
  assert.match(result.profile.historyUrl, /action=history/);
  assert.equal(result.profile.license, 'CC BY-SA 4.0');
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url.hostname, 'en.wikipedia.org');
  assert.equal(calls[2].url.searchParams.get('exsectionformat'), 'wiki');
  assert.ok(calls.every(({ options }) => options.signal && options.headers['User-Agent'].includes('BirdWanderer')));
  assert.equal(result.fetchedAt, '1970-01-01T00:00:01.000Z');
});

test('missing sections stay null; nested sections and headings are bounded without inferring season from a sentence', () => {
  const partial = articleSections('A bird may migrate in winter.\n== Description ==\nBlue wings.\n== Breeding ==\nBreeds in May.');
  assert.equal(partial.seasonality, null);
  assert.equal(partial.behaviour, null);
  assert.equal(partial.habitat, null);
  assert.equal(partial.identification.text, 'Blue wings.');
  assert.match(articleSections(extract).behaviour.text, /Perches before feeding. Feeds on insects/);
  assert.doesNotMatch(articleSections(extract).behaviour.text, /populations move|Not a bird/);
  assert.ok(articleSections('x '.repeat(1000)).summary.endsWith('…'));
  assert.ok(articleSections('x'.repeat(5000)).summary.length <= 1201);
  for (const invalid of [null, '', {}, '\x01unreadable', 'x'.repeat(100001)]) assert.equal(articleSections(invalid), null);
});

test('wrong species, namespace, disambiguation, no sitelink and empty articles produce no match', async () => {
  for (const mutate of [
    (p) => { p.pageprops.wikibase_item = 'Q999'; },
    (p) => { p.pageprops.disambiguation = ''; },
    (p) => { p.ns = 1; },
    (p) => { p.extract = ''; },
    (p) => { p.lastrevid = null; },
  ]) {
    const p = page(); mutate(p);
    assert.equal((await createSpeciesInfoService({ fetchImpl: upstream([], (url) => url.hostname === 'en.wikipedia.org' ? { query: { pages: [p] } } : undefined) }).information('Coracias benghalensis')).profile, null);
  }
  const e = entity(); e.sitelinks = {};
  assert.equal((await createSpeciesInfoService({ fetchImpl: upstream([], (url) => url.searchParams.get('action') === 'wbgetentities' ? { entities: { Q2: e } } : undefined) }).information('Coracias benghalensis')).profile, null);
});

test('information shares concurrent loads, preserves retrieval time, expires and caches no-match but not failures', async () => {
  const calls = [];
  let time = 1000;
  const service = createSpeciesInfoService({ fetchImpl: upstream(calls), now: () => time, ttl: 100 });
  const [first, second] = await Promise.all([service.information('Coracias benghalensis'), service.information('Coracias benghalensis')]);
  assert.equal(calls.length, 3);
  assert.equal(first.fetchedAt, second.fetchedAt);
  time += 50;
  assert.equal((await service.information('Coracias benghalensis')).cached, true);
  time += 51;
  assert.equal((await service.information('Coracias benghalensis')).cached, false);
  assert.equal(calls.length, 6);
  let count = 0;
  const missing = createSpeciesInfoService({ fetchImpl: async () => { count++; return Response.json({ search: [] }); } });
  await missing.information('Alcedo atthis'); await missing.information('Alcedo atthis');
  assert.equal(count, 1);
  let failed = true;
  const retry = createSpeciesInfoService({ fetchImpl: (url, options) => failed ? new Response('', { status: 429 }) : upstream()(url, options) });
  await assert.rejects(retry.information('Coracias benghalensis'), { status: 503 });
  failed = false;
  assert.ok((await retry.information('Coracias benghalensis')).profile);
});

test('invalid names and malformed provider payloads fail safely without exposing provider messages', async () => {
  let count = 0;
  const service = createSpeciesInfoService({ fetchImpl: async () => { count++; return Response.json({ search: [] }); } });
  for (const name of [null, '', 'x'.repeat(201)]) await assert.rejects(service.information(name), { status: 400 });
  assert.equal(count, 0);
  for (const response of [new Response('bad-json'), Response.json({ error: { info: 'provider secret' } }), Response.json({ search: null })]) {
    await assert.rejects(createSpeciesInfoService({ fetchImpl: async () => response }).information('Coracias benghalensis'), (error) => error.status === 502 && !error.message.includes('provider secret'));
  }
});
