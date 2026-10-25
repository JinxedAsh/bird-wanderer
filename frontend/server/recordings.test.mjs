import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRecordingService, recordingFrom } from './recordings.mjs';

const claim = (value) => ({ mainsnak: { snaktype: 'value', datavalue: { value } } });
const entity = (name = 'Coracias benghalensis') => ({ claims: { P225: [claim(name)], P105: [claim({ id: 'Q7432' })], P51: [claim('Bird call.ogg')] } });
const page = () => ({ ns: 6, title: 'File:Bird call.ogg', imageinfo: [{ mediatype: 'AUDIO', mime: 'audio/ogg', size: 1000, url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Bird_call.ogg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Bird_call.ogg', extmetadata: { Artist: { value: '<a>Recorder</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' } } }] });
const upstream = (calls = [], override = () => undefined) => async (url, options) => {
  calls.push({ url, options });
  const custom = override(url);
  if (custom !== undefined) return Response.json(custom);
  if (url.searchParams.get('action') === 'wbsearchentities') return Response.json({ search: [{ id: 'Q1' }, { id: 'Q2' }] });
  if (url.searchParams.get('action') === 'wbgetentities') return Response.json({ entities: { Q1: entity('Coracias benghalensis indicus'), Q2: entity() } });
  return Response.json({ query: { pages: [page()] } });
};

test('recording resolves exact species and explicit P51 file, retains attribution and deduplicates/cache expires', async () => {
  const calls = []; let time = 0;
  const service = createRecordingService({ fetchImpl: upstream(calls), now: () => time, ttl: 100 });
  const [a, b] = await Promise.all([service.recording('Coracias benghalensis'), service.recording(' coracias  benghalensis ')]);
  assert.equal(a.recording.matchedEntityId, 'Q2'); assert.equal(a.recording.author, 'Recorder');
  assert.deepEqual(a, b); assert.equal(calls.length, 3);
  assert.equal(calls[2].url.searchParams.get('titles'), 'File:Bird call.ogg');
  assert.ok(calls.every(({ options }) => options.signal && options.headers['User-Agent']));
  assert.equal((await service.recording('Coracias benghalensis')).cached, true);
  time = 101; await service.recording('Coracias benghalensis'); assert.equal(calls.length, 6);
});

test('unsupported taxonomy, no P51, mismatched file and malformed titles never substitute another recording', async () => {
  for (const mutate of [(e) => { e.claims.P225 = [claim('Other species')]; }, (e) => { e.claims.P105 = [claim({ id: 'Q34740' })]; }, (e) => { e.claims.P51 = []; }, (e) => { e.claims.P51 = [claim('bad|injected.ogg')]; }]) {
    const e = entity(); mutate(e);
    const result = await createRecordingService({ fetchImpl: upstream([], (url) => url.searchParams.get('action') === 'wbgetentities' ? { entities: { Q2: e } } : undefined) }).recording('Coracias benghalensis');
    assert.equal(result.recording, null);
  }
  for (const badPage of [{ ...page(), title: 'File:Another bird.ogg' }, { ...page(), title: {} }, { ...page(), ns: 0 }]) {
    const result = await createRecordingService({ fetchImpl: upstream([], (url) => url.hostname === 'commons.wikimedia.org' ? { query: { pages: [badPage] } } : undefined) }).recording('Coracias benghalensis');
    assert.equal(result.recording, null);
  }
});

test('unsafe or unlicensed/non-audio/oversized provider files are rejected; HTML credits stay text', () => {
  for (const mutate of [(i) => { i.mime = 'text/html'; }, (i) => { i.mediatype = 'VIDEO'; }, (i) => { i.size = 21 * 1024 * 1024; }, (i) => { i.size = 0; }, (i) => { i.url = 'https://evil.test/a.ogg'; }, (i) => { i.url = 'https://upload.wikimedia.org@evil.test/wikipedia/commons/a.ogg'; }, (i) => { i.descriptionurl = 'javascript:alert(1)'; }, (i) => { i.extmetadata.LicenseUrl.value = 'https://creativecommons.org/licenses/by-nc/4.0/'; }, (i) => { i.extmetadata.Artist.value = ''; }]) {
    const p = page(); mutate(p.imageinfo[0]); assert.equal(recordingFrom(p, 'Q2', 'Coracias benghalensis'), null);
  }
  const p = page(); p.imageinfo[0].extmetadata.Artist.value = '<script>bad()</script><b>Recorder &amp; friend</b>';
  assert.equal(recordingFrom(p, 'Q2', 'Coracias benghalensis').author, 'Recorder & friend');
});

test('provider failures are explicit and not cached; malformed bodies are rejected', async () => {
  let fail = true;
  const service = createRecordingService({ fetchImpl: async (...args) => { if (fail) throw new Error('offline'); return upstream()(...args); } });
  await assert.rejects(service.recording('Coracias benghalensis'), { status: 503 });
  fail = false; assert.ok((await service.recording('Coracias benghalensis')).recording);
  for (const fetchImpl of [async () => new Response('bad'), async () => Response.json({ error: {} }), async () => Response.json({ search: {} })]) {
    await assert.rejects(createRecordingService({ fetchImpl }).recording('Coracias benghalensis'), { status: 502 });
  }
  await assert.rejects(service.recording(''), { status: 400 });
});

test('recording lookups bound concurrent providers and pending names without losing shared requests', async () => {
  const release = [];
  let active = 0; let maximum = 0;
  const fetchImpl = async (url) => {
    active++; maximum = Math.max(maximum, active);
    await new Promise((resolve) => release.push(resolve));
    active--;
    return Response.json({ search: [] });
  };
  const service = createRecordingService({ fetchImpl });
  const requests = Array.from({ length: 20 }, (_, i) => service.recording(`Species ${i}`));
  const shared = service.recording('Species 0');
  await assert.rejects(service.recording('Species overflow'), { status: 503 });
  while (release.length) {
    release.splice(0).forEach((resolve) => resolve());
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal((await shared).recording, null);
  assert.equal((await Promise.all(requests)).length, 20);
  assert.equal(maximum, 3);
});
