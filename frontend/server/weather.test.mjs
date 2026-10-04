import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWeatherService } from './weather.mjs';

function forecast() {
  return { timezone: 'Asia/Kolkata', current_units: { temperature_2m: '\u00b0C', wind_speed_10m: 'km/h', relative_humidity_2m: '%', cloud_cover: '%', precipitation: 'mm' },
    current: { time: '2026-10-04T07:15', temperature_2m: 0, wind_speed_10m: 0, precipitation: 0, relative_humidity_2m: 70, cloud_cover: 0, weather_code: 0 },
    hourly_units: { temperature_2m: '\u00b0C', wind_speed_10m: 'km/h', precipitation_probability: '%' },
    hourly: { time: ['2026-10-04T07:00', '2026-10-04T08:00', '2026-10-04T09:00'], temperature_2m: [1, 2, null], wind_speed_10m: [0, 10, null], precipitation_probability: [0, 20, null] },
    daily: { time: ['2026-10-04', '2026-10-05'], sunrise: ['2026-10-04T06:14', '2026-10-05T06:15'], sunset: ['2026-10-04T18:02', null] } };
}

test('weather requests correct coordinates/units and preserves zero, missing data, timezone and future forecasts', async () => {
  let requested;
  const service = createWeatherService({ fetchImpl: async (url) => { requested = url; return Response.json(forecast()); }, now: () => 1000 });
  const result = await service.forecast(0, 77.2);
  assert.equal(requested.origin, 'https://api.open-meteo.com');
  assert.equal(requested.searchParams.get('latitude'), '0');
  assert.equal(requested.searchParams.get('longitude'), '77.2');
  assert.equal(requested.searchParams.get('timezone'), 'auto');
  assert.equal(requested.searchParams.get('wind_speed_unit'), 'kmh');
  assert.equal(requested.searchParams.has('apikey'), false);
  assert.equal(result.current.temperatureC, 0);
  assert.equal(result.current.windKmh, 0);
  assert.equal(result.current.condition, 'Clear');
  assert.equal(result.timezone, 'Asia/Kolkata');
  assert.equal(result.hourly.length, 2);
  assert.equal(result.hourly[0].rainProbability, 20);
  assert.equal(result.hourly[1].temperatureC, null);
  assert.equal(result.days[1].sunset, null);
  assert.equal(result.fetchedAt, '1970-01-01T00:00:01.000Z');
});

test('weather shares concurrent loads, separates coordinates, expires cache and preserves retrieval time', async () => {
  let calls = 0;
  let time = 1000;
  const service = createWeatherService({ fetchImpl: async () => { calls++; return Response.json(forecast()); }, now: () => time, ttl: 100 });
  const [one, two] = await Promise.all([service.forecast(28, 77), service.forecast(28, 77)]);
  assert.equal(calls, 1);
  assert.equal(one.fetchedAt, two.fetchedAt);
  time += 50;
  const cached = await service.forecast(28, 77);
  assert.equal(cached.cached, true);
  assert.equal(cached.fetchedAt, one.fetchedAt);
  await service.forecast(29, 77);
  assert.equal(calls, 2);
  time += 51;
  assert.equal((await service.forecast(28, 77)).cached, false);
  assert.equal(calls, 3);
});

test('weather rejects invalid coordinates, units, response structure and inconsistent time arrays', async () => {
  let calls = 0;
  const service = createWeatherService({ fetchImpl: async () => { calls++; return Response.json(forecast()); } });
  for (const point of [[NaN, 77], [28, Infinity], [91, 77], [28, -181], ['28', 77]]) await assert.rejects(service.forecast(...point), { status: 400 });
  assert.equal(calls, 0);
  for (const mutate of [
    (data) => { data.current_units.wind_speed_10m = 'mph'; },
    (data) => { data.timezone = 'invalid/zone'; },
    (data) => { data.hourly.temperature_2m.pop(); },
    (data) => { data.hourly.time.reverse(); },
    (data) => { data.daily.sunrise[0] = '2026-10-05T06:14'; },
  ]) {
    const data = forecast(); mutate(data);
    const invalid = createWeatherService({ fetchImpl: async () => Response.json(data) });
    await assert.rejects(invalid.forecast(28, 77), { status: 502 });
  }
});

test('weather failures are retryable and do not reuse expired forecasts', async () => {
  let fail = true;
  let time = 1000;
  const service = createWeatherService({ now: () => time, ttl: 100, fetchImpl: async () => fail ? new Response('', { status: 429 }) : Response.json(forecast()) });
  await assert.rejects(service.forecast(28, 77), { status: 503 });
  fail = false;
  assert.equal((await service.forecast(28, 77)).cached, false);
  time += 101; fail = true;
  await assert.rejects(service.forecast(28, 77), { status: 503 });
  const unreadable = createWeatherService({ fetchImpl: async () => new Response('not-json') });
  await assert.rejects(unreadable.forecast(28, 77), { status: 502 });
  const offline = createWeatherService({ fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(offline.forecast(28, 77), { status: 503 });
});
