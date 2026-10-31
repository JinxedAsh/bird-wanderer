export const weatherFailure = (status, message) => Object.assign(new Error(message), { status });
export const validPoint = (point) => point && typeof point.latitude === 'number' && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && typeof point.longitude === 'number' && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
export const roundedPoint = (point) => ({ latitude: Math.round(point.latitude * 10) / 10, longitude: Math.round(point.longitude * 10) / 10 });
export function weatherQuery(input, now = Date.now()) {
  if (!validPoint(input) || typeof input.observedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.observedAt)) throw weatherFailure(400, 'Choose valid coordinates and a local observation date/time.');
  const time = Date.parse(input.observedAt + ':00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 16) !== input.observedAt || time < Date.UTC(1940, 0, 1) || time > now + 14 * 3600000) throw weatherFailure(400, 'Historical weather requires a valid past date from 1940 onward.');
  const utcOffset = input.utcOffset == null || input.utcOffset === '' ? null : input.utcOffset;
  if (utcOffset !== null && (typeof utcOffset !== 'string' || !/^[+-](?:0\d|1[0-3]):[0-5]\d$|^[+-]14:00$/.test(utcOffset))) throw weatherFailure(400, 'Choose a valid UTC offset or leave it unknown.');
  const instant = utcOffset ? Date.parse(input.observedAt + ':00' + utcOffset) : null;
  if (instant !== null && instant > now) throw weatherFailure(400, 'Future observations cannot have historical conditions.');
  return { ...roundedPoint(input), observedAt: input.observedAt, utcOffset };
}

export function createObservationWeather({ fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  const variables = ['temperature_2m', 'relative_humidity_2m', 'precipitation', 'cloud_cover', 'wind_speed_10m'];
  const units = ['°C', '%', 'mm', '%', 'km/h'];
  const bounds = [[-100, 70], [0, 100], [0, 1000], [0, 100], [0, 500]];
  async function load(query) {
    const utcTime = query.utcOffset ? new Date(Date.parse(query.observedAt + ':00' + query.utcOffset)).toISOString().slice(0, 16) : null;
    const target = utcTime || query.observedAt;
    const date = target.slice(0, 10);
    const recent = now() - Date.parse(date + 'T00:00Z') < 6 * 86400000;
    const url = new URL(recent ? 'https://api.open-meteo.com/v1/forecast' : 'https://archive-api.open-meteo.com/v1/archive');
    for (const [key, value] of Object.entries({ ...roundedPoint(query), start_date: date, end_date: date, timezone: utcTime ? 'GMT' : 'auto', hourly: variables.join(','), temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' })) url.searchParams.set(key, String(value));
    let response;
    try { response = await fetchImpl(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } }); }
    catch { throw weatherFailure(502, 'Historical weather could not be reached. Retry or save without conditions.'); }
    if (!response.ok) throw weatherFailure(502, 'Historical weather is unavailable for this date (recent archive data may be delayed). Retry or save without conditions.');
    let data;
    try { const text = await response.text(); if (text.length > 500000) throw new Error(); data = JSON.parse(text); }
    catch { throw weatherFailure(502, 'Historical weather returned unreadable data.'); }
    const bad = () => { throw weatherFailure(502, 'Historical weather returned unsupported or missing hourly data.'); };
    const hourly = data?.hourly;
    if (!validPoint(data) || Math.abs(data.latitude - query.latitude) > 1 || Math.min(Math.abs(data.longitude - query.longitude), 360 - Math.abs(data.longitude - query.longitude)) > 1) bad();
    if (!Number.isInteger(data?.utc_offset_seconds) || Math.abs(data.utc_offset_seconds) > 14 * 3600 || typeof data.timezone !== 'string') bad();
    if (utcTime && (data.utc_offset_seconds !== 0 || !['GMT', 'UTC', 'Etc/UTC'].includes(data.timezone))) bad();
    try { new Intl.DateTimeFormat('en', { timeZone: data.timezone }); } catch { bad(); }
    if (!Array.isArray(hourly?.time) || hourly.time.length < 1 || hourly.time.length > 26 || hourly.time.some((time, i) => typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(time) || time.slice(0, 10) !== date || (i > 0 && time <= hourly.time[i - 1]))) bad();
    for (let i = 0; i < variables.length; i++) if (data.hourly_units?.[variables[i]] !== units[i] || !Array.isArray(hourly[variables[i]]) || hourly[variables[i]].length !== hourly.time.length) bad();
    const matchedTime = target.slice(0, 13) + ':00';
    const index = hourly.time.indexOf(matchedTime);
    if (index < 0) bad();
    if (Date.parse(matchedTime + ':00Z') - data.utc_offset_seconds * 1000 > now()) throw weatherFailure(400, 'Future observations cannot have historical conditions.');
    const values = variables.map((key, i) => { const value = hourly[key][index]; if (value === null) return null; if (typeof value !== 'number' || !Number.isFinite(value) || value < bounds[i][0] || value > bounds[i][1]) bad(); return value; });
    if (values.every(value => value === null)) throw weatherFailure(502, 'No historical conditions are available for this hour yet.');
    return { source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/en/docs/historical-weather-api', model: recent ? 'Recent past weather model estimate' : 'Archive best-match reanalysis/model estimate',
      observedAt: query.observedAt, matchedTime, timezone: data.timezone, utcOffset: query.utcOffset, timeBasis: utcTime ? 'Recorded/manual UTC offset; camera clock not verified' : 'Assumed local clock in location timezone; exact instant unverified',
      ...roundedPoint(query), fetchedAt: new Date(now()).toISOString(), temperatureC: values[0], humidityPercent: values[1], precipitationMm: values[2], cloudCoverPercent: values[3], windKmh: values[4] };
  }
  return { async load(input) {
    const query = weatherQuery(input, now()), key = JSON.stringify(query);
    const entry = cache.get(key);
    if (entry && now() - entry.time < 15 * 60000) return entry.value;
    if (!pending.has(key)) {
      if (pending.size >= 10) throw weatherFailure(503, 'Historical weather is busy. Please retry shortly.');
      pending.set(key, load(query).then(value => { if (cache.size >= 100) cache.delete(cache.keys().next().value); cache.set(key, { time: now(), value }); return value; }).finally(() => pending.delete(key)));
    }
    return pending.get(key);
  } };
}
