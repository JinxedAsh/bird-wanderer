import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createObservationWeather, weatherQuery } from './observation-weather.mjs';

const now = Date.parse('2026-10-31T12:00Z');
const input = { latitude: 28.56789, longitude: 77.12345, observedAt: '2026-03-22T09:45', utcOffset: null };
const data = (url) => {
  const date = url.searchParams.get('start_date');
  return { latitude: Number(url.searchParams.get('latitude')), longitude: Number(url.searchParams.get('longitude')), timezone: url.searchParams.get('timezone') === 'GMT' ? 'GMT' : 'Asia/Kolkata', utc_offset_seconds: url.searchParams.get('timezone') === 'GMT' ? 0 : 19800,
    hourly_units: { temperature_2m: '°C', relative_humidity_2m: '%', precipitation: 'mm', cloud_cover: '%', wind_speed_10m: 'km/h' },
    hourly: { time: Array.from({ length: 24 }, (_, i) => `${date}T${String(i).padStart(2, '0')}:00`), temperature_2m: Array(24).fill(0), relative_humidity_2m: Array(24).fill(50), precipitation: Array(24).fill(0), cloud_cover: Array(24).fill(null), wind_speed_10m: Array(24).fill(0) } };
};
test('historical query rejects invalid/future dates, bounds/offsets and rounds coordinates including zero', () => {
  assert.equal(weatherQuery({ ...input, latitude: 0, longitude: 0 }, now).latitude, 0);
  assert.deepEqual(weatherQuery(input, now), { ...input, latitude: 28.6, longitude: 77.1 });
  for (const change of [{ latitude: 91 }, { longitude: '77' }, { observedAt: '2026-02-30T10:00' }, { observedAt: '1939-01-01T00:00' }, { observedAt: '2027-01-01T00:00' }, { utcOffset: '+15:00' }]) assert.throws(() => weatherQuery({ ...input, ...change }, now), /valid|past|offset/);
});
test('archive uses requested local hour, honest missing values and rounded coordinates; shares/caches requests', async () => {
  const requests = [];
  const service = createObservationWeather({ now: () => now, fetchImpl: async url => { requests.push(new URL(url)); return Response.json(data(url)); } });
  const [a, b] = await Promise.all([service.load(input), service.load(input)]);
  assert.equal(requests.length, 1); assert.deepEqual(a, b);
  assert.equal(requests[0].hostname, 'archive-api.open-meteo.com');
  assert.equal(requests[0].searchParams.get('latitude'), '28.6'); assert.equal(requests[0].searchParams.get('longitude'), '77.1');
  assert.equal(a.matchedTime, '2026-03-22T09:00'); assert.match(a.timeBasis, /Assumed local/);
  assert.equal(a.temperatureC, 0); assert.equal(a.cloudCoverPercent, null); assert.match(a.model, /reanalysis/);
  assert.equal(new URL(a.sourceUrl).search, ''); await service.load(input); assert.equal(requests.length, 1);
});
test('known offset selects UTC hour across date boundary; recent endpoint never substitutes current weather', async () => {
  const requests = [];
  const service = createObservationWeather({ now: () => now, fetchImpl: async url => { requests.push(new URL(url)); return Response.json(data(url)); } });
  const a = await service.load({ ...input, observedAt: '2026-03-22T02:15', utcOffset: '+05:30' });
  assert.equal(requests[0].searchParams.get('start_date'), '2026-03-21'); assert.equal(a.matchedTime, '2026-03-21T20:00'); assert.equal(a.timezone, 'GMT');
  const recent = await service.load({ ...input, observedAt: '2026-10-30T09:45' });
  assert.equal(requests[1].hostname, 'api.open-meteo.com'); assert.equal(requests[1].searchParams.get('start_date'), '2026-10-30'); assert.match(recent.model, /Recent past/);
  assert.equal(requests[1].searchParams.has('current'), false);
  const wrongZone = createObservationWeather({ now: () => now, fetchImpl: async url => Response.json({ ...data(url), utc_offset_seconds: 19800 }) });
  await assert.rejects(wrongZone.load({ ...input, utcOffset: '+05:30' }), /unsupported/);
});
test('units/identity/missing data/provider delay fail honestly and failures can retry', async () => {
  for (const mutate of [value => { value.hourly_units.temperature_2m = '°F'; }, value => { value.hourly.time = []; }, value => { value.latitude = 0; }, value => { value.hourly.temperature_2m[9] = 999; }, value => { value.timezone = 'invalid'; }, value => { for (const key of Object.keys(value.hourly)) if (key !== 'time') value.hourly[key][9] = null; }]) {
    const service = createObservationWeather({ now: () => now, fetchImpl: async url => { const value = data(url); mutate(value); return Response.json(value); } });
    await assert.rejects(service.load(input), /unsupported|No historical/);
  }
  let calls = 0;
  const service = createObservationWeather({ now: () => now, fetchImpl: async url => ++calls === 1 ? new Response('{}', { status: 503 }) : Response.json(data(url)) });
  await assert.rejects(service.load(input), /delayed/); await service.load(input); assert.equal(calls, 2);
});
test('in-flight distinct requests are bounded and a failed request releases capacity', async () => {
  const jobs = [];
  const service = createObservationWeather({ now: () => now, fetchImpl: url => new Promise(resolve => jobs.push(() => resolve(Response.json(data(url))))) });
  const pending = Array.from({ length: 10 }, (_, latitude) => service.load({ ...input, latitude }));
  await assert.rejects(service.load({ ...input, latitude: 20 }), /busy/);
  jobs.forEach(resolve => resolve()); await Promise.all(pending);
});
