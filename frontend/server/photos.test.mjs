import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPhotoService } from './photos.mjs';

const statement = (value, rank = 'normal') => ({ rank, mainsnak: { snaktype: 'value', datavalue: { value } } });
const entity = (name = 'Coracias benghalensis') => ({ claims: { P225: [statement(name)], P105: [statement({ id: 'Q7432' })], P18: [statement('Indian Roller.jpg')] } });
const file = () => ({ title: 'File:Indian Roller.jpg', imageinfo: [{ mime: 'image/jpeg', mediatype: 'BITMAP',
  thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Indian_Roller.jpg/960px-Indian_Roller.jpg',
  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Indian_Roller.jpg',
  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Indian_Roller.jpg',
  extmetadata: { Artist: { value: '<a href="https://example.org">A &amp; B</a>' }, Credit: { value: 'Own work' }, Attribution: { value: 'A &amp; B' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' } } }] });

function upstream(calls = [], override = () => undefined) {
  return async (url, options) => {
    calls.push({ url, options });
    const params = url.searchParams;
    const value = override(url);
    if (value !== undefined) return Response.json(value);
    if (params.get('action') === 'wbsearchentities') return Response.json({ search: [{ id: 'Q1' }, { id: 'Q2' }] });
    if (params.get('action') === 'wbgetentities') return Response.json({ entities: { Q1: entity('Coracias benghalensis indicus'), Q2: entity() } });
    return Response.json({ query: { pages: [file()] } });
  };
}

test('photos match exact scientific species name, ignore unrelated results and retain creator/licence/provenance', async () => {
  const calls = [];
  const result = await createPhotoService({ fetchImpl: upstream(calls), now: () => 1000 }).photo('Coracias benghalensis');
  assert.equal(result.photo.matchedEntityId, 'Q2');
  assert.equal(result.photo.scientificName, 'Coracias benghalensis');
  assert.equal(result.photo.author, 'A & B');
  assert.equal(result.photo.credit, 'Own work');
  assert.equal(result.photo.license, 'CC BY-SA 4.0');
  assert.equal(result.photo.originalUrl.includes('Indian_Roller.jpg'), true);
  assert.equal(result.fetchedAt, '1970-01-01T00:00:01.000Z');
  assert.equal(calls.length, 3);
  assert.ok(calls.every(({ options }) => options.signal && options.headers['User-Agent'].includes('BirdWanderer')));
  assert.ok(calls.every(({ url }) => !url.searchParams.has('apikey')));
  assert.equal(calls[2].url.searchParams.get('iiurlwidth'), '960');
  assert.ok(calls[2].url.searchParams.get('iiprop').split('|').includes('metadata'));
  assert.equal(calls[2].url.searchParams.get('iimetadataversion'), 'latest');
  assert.equal(result.photo.exif.status, 'unavailable');
});

test('photo EXIF comes from the same selected file metadata and never description-page claims', async () => {
  const page = file();
  page.imageinfo[0].metadata = [{ name: 'ExposureTime', value: '1/400' }, { name: 'ISOSpeedRatings', value: 200 }, { name: 'GPSLatitude', value: 'private-coordinate' }];
  page.imageinfo[0].extmetadata.ExposureTime = { value: '1/9999' };
  const result = await createPhotoService({ fetchImpl: upstream([], (url) => url.hostname === 'commons.wikimedia.org' ? { query: { pages: [page] } } : undefined) }).photo('Coracias benghalensis');
  assert.equal(result.photo.exif.exposureSeconds, 0.0025);
  assert.equal(result.photo.exif.iso, 200);
  assert.equal(result.photo.exif.aperture, null);
  assert.doesNotMatch(JSON.stringify(result), /GPS|private-coordinate|9999/);
});

test('missing photos, taxonomic mismatches and deprecated claims return no match instead of another bird', async () => {
  for (const candidate of [entity('Alcedo atthis'), { claims: {} }, { claims: { ...entity().claims, P105: [statement({ id: 'Q68947' })] } }, { claims: { ...entity().claims, P225: [statement('Coracias benghalensis', 'deprecated')] } }]) {
    const service = createPhotoService({ fetchImpl: upstream([], (url) => url.searchParams.get('action') === 'wbgetentities' ? { entities: { Q1: candidate, Q2: candidate } } : undefined) });
    assert.equal((await service.photo('Coracias benghalensis')).photo, null);
  }
  const empty = createPhotoService({ fetchImpl: async () => Response.json({ search: [] }) });
  assert.equal((await empty.photo('Coracias benghalensis')).photo, null);
});

test('photos reject unsupported licences, incomplete credits, vector artwork and unsafe URLs', async () => {
  for (const mutate of [
    (info) => { info.extmetadata.Artist.value = ''; },
    (info) => { info.extmetadata.LicenseUrl.value = 'https://example.org/licence'; },
    (info) => { info.extmetadata.LicenseUrl.value = 'javascript:alert(1)'; },
    (info) => { info.extmetadata.LicenseUrl.value = 'https://creativecommons.org/licenses/by-nc/4.0/'; },
    (info) => { info.thumburl = 'https://upload.wikimedia.org.evil.test/wikipedia/commons/test.jpg'; },
    (info) => { info.url = 'https://user:password@upload.wikimedia.org/wikipedia/commons/test.jpg'; },
    (info) => { info.descriptionurl = 'http://commons.wikimedia.org/wiki/File:Test.jpg'; },
    (info) => { info.mime = 'image/svg+xml'; },
  ]) {
    const page = file(); mutate(page.imageinfo[0]);
    const service = createPhotoService({ fetchImpl: upstream([], (url) => url.hostname === 'commons.wikimedia.org' ? { query: { pages: [page] } } : undefined) });
    assert.equal((await service.photo('Coracias benghalensis')).photo, null);
  }
});

test('provider HTML becomes inert credit text and required attribution is retained', async () => {
  const page = file();
  page.imageinfo[0].extmetadata.Artist.value = '<script>alert(1)</script><a onclick="steal()">&#65; &amp; B</a>';
  page.imageinfo[0].extmetadata.Attribution.value = '&lt;img src=x onerror=alert(1)&gt;';
  const result = await createPhotoService({ fetchImpl: upstream([], (url) => url.hostname === 'commons.wikimedia.org' ? { query: { pages: [page] } } : undefined) }).photo('Coracias benghalensis');
  assert.equal(result.photo.author, 'A & B');
  assert.equal(result.photo.attribution, '<img src=x onerror=alert(1)>');
});

test('photo cache shares concurrent requests, expires and caches no-match results without caching failures', async () => {
  const calls = [];
  let time = 1000;
  const service = createPhotoService({ fetchImpl: upstream(calls), now: () => time, ttl: 100 });
  const [first, second] = await Promise.all([service.photo('Coracias benghalensis'), service.photo('Coracias benghalensis')]);
  assert.equal(calls.length, 3);
  assert.equal(first.fetchedAt, second.fetchedAt);
  time += 50;
  const cached = await service.photo('Coracias benghalensis');
  assert.equal(cached.cached, true);
  assert.equal(cached.fetchedAt, first.fetchedAt);
  time += 51;
  assert.equal((await service.photo('Coracias benghalensis')).cached, false);
  assert.equal(calls.length, 6);
  let count = 0;
  const noMatch = createPhotoService({ fetchImpl: async () => { count++; return Response.json({ search: [] }); } });
  await noMatch.photo('Alcedo atthis'); await noMatch.photo('Alcedo atthis');
  assert.equal(count, 1);
  let fail = true;
  const retry = createPhotoService({ fetchImpl: async (url, options) => fail ? new Response('', { status: 429 }) : upstream()(url, options) });
  await assert.rejects(retry.photo('Coracias benghalensis'), { status: 503 });
  fail = false;
  assert.ok((await retry.photo('Coracias benghalensis')).photo);
});

test('invalid names and malformed provider responses fail safely without leaking upstream details', async () => {
  let calls = 0;
  const service = createPhotoService({ fetchImpl: async () => { calls++; return Response.json({ search: [] }); } });
  for (const name of ['', null, 'x'.repeat(201)]) await assert.rejects(service.photo(name), { status: 400 });
  assert.equal(calls, 0);
  for (const response of [new Response('not-json'), Response.json({ error: { info: 'upstream secret' } }), Response.json({ search: null })]) {
    const invalid = createPhotoService({ fetchImpl: async () => response });
    await assert.rejects(invalid.photo('Coracias benghalensis'), (error) => error.status === 502 && !error.message.includes('upstream secret'));
  }
});
