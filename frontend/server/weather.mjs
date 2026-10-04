export class WeatherError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const conditions = new Map([
  [0, 'Clear'], [1, 'Mainly clear'], [2, 'Partly cloudy'], [3, 'Overcast'],
  [45, 'Fog'], [48, 'Freezing fog'], [51, 'Light drizzle'], [53, 'Drizzle'], [55, 'Heavy drizzle'],
  [56, 'Freezing drizzle'], [57, 'Heavy freezing drizzle'], [61, 'Light rain'], [63, 'Rain'], [65, 'Heavy rain'],
  [66, 'Freezing rain'], [67, 'Heavy freezing rain'], [71, 'Light snow'], [73, 'Snow'], [75, 'Heavy snow'],
  [77, 'Snow grains'], [80, 'Light rain showers'], [81, 'Rain showers'], [82, 'Heavy rain showers'],
  [85, 'Snow showers'], [86, 'Heavy snow showers'], [95, 'Thunderstorm'], [96, 'Thunderstorm with hail'], [99, 'Thunderstorm with heavy hail'],
]);
const localTime = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
const valueIn = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;

// Shared location forecasts, not user GPS. Inject fetch/time for isolated tests.
export function createWeatherService({ fetchImpl = fetch, now = Date.now, ttl = 15 * 60 * 1000 } = {}) {
  const cache = new Map();
  const pending = new Map();
  async function load(latitude, longitude) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude),
      current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m',
      hourly: 'temperature_2m,precipitation_probability,wind_speed_10m', daily: 'sunrise,sunset',
      timezone: 'auto', forecast_days: '2', temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' }).toString();
    let response;
    try { response = await fetchImpl(url, { signal: AbortSignal.timeout(10000) }); }
    catch { throw new WeatherError(503, 'Cannot reach weather forecasts. Please try again.'); }
    if (!response.ok) throw new WeatherError(503, 'Weather forecasts are unavailable. Please try again.');
    let data;
    try { data = await response.json(); }
    catch { throw new WeatherError(502, 'The weather provider returned unreadable data.'); }
    const { current, hourly, daily } = data || {};
    const units = data?.current_units;
    const hourlyUnits = data?.hourly_units;
    const bad = () => { throw new WeatherError(502, 'The weather provider returned unsupported data.'); };
    if (!localTime(current?.time) || units?.temperature_2m !== '\u00b0C' || units?.wind_speed_10m !== 'km/h' || units?.precipitation !== 'mm' || units?.relative_humidity_2m !== '%' || units?.cloud_cover !== '%') bad();
    try { new Intl.DateTimeFormat('en', { timeZone: data.timezone }); }
    catch { bad(); }
    if (typeof data.timezone !== 'string' || !Array.isArray(hourly?.time) || !Array.isArray(daily?.time) || !hourly.time.length || !daily.time.length) bad();
    for (const name of ['temperature_2m', 'precipitation_probability', 'wind_speed_10m']) {
      if (!Array.isArray(hourly[name]) || hourly[name].length !== hourly.time.length) bad();
    }
    if (hourlyUnits?.temperature_2m !== '\u00b0C' || hourlyUnits?.wind_speed_10m !== 'km/h' || hourlyUnits?.precipitation_probability !== '%') bad();
    for (const name of ['sunrise', 'sunset']) if (!Array.isArray(daily[name]) || daily[name].length !== daily.time.length) bad();
    if (hourly.time.some((time, i) => !localTime(time) || (i > 0 && time <= hourly.time[i - 1]))) bad();
    if (daily.time.some((day) => typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day))) bad();
    const days = daily.time.map((date, i) => {
      const sunrise = daily.sunrise[i];
      const sunset = daily.sunset[i];
      if ((sunrise != null && (!localTime(sunrise) || !sunrise.startsWith(date))) || (sunset != null && (!localTime(sunset) || !sunset.startsWith(date)))) bad();
      return { date, sunrise: sunrise ?? null, sunset: sunset ?? null };
    });
    return { source: 'Open-Meteo', sourceUrl: 'https://open-meteo.com/', latitude, longitude, timezone: data.timezone,
      fetchedAt: new Date(now()).toISOString(),
      current: { time: current.time, temperatureC: valueIn(current.temperature_2m, -100, 70), windKmh: valueIn(current.wind_speed_10m, 0, 500),
        humidityPercent: valueIn(current.relative_humidity_2m, 0, 100), precipitationMm: valueIn(current.precipitation, 0, 1000),
        cloudCoverPercent: valueIn(current.cloud_cover, 0, 100), condition: conditions.get(current.weather_code) || 'Conditions unavailable' },
      hourly: hourly.time.map((time, i) => ({ time, temperatureC: valueIn(hourly.temperature_2m[i], -100, 70), rainProbability: valueIn(hourly.precipitation_probability[i], 0, 100), windKmh: valueIn(hourly.wind_speed_10m[i], 0, 500) }))
        .filter((row) => row.time >= current.time).slice(0, 24), days };
  }
  return {
    async forecast(latitude, longitude) {
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new WeatherError(400, 'Valid hotspot coordinates are required for weather.');
      const key = `${latitude},${longitude}`;
      const entry = cache.get(key);
      if (entry && now() - entry.time < ttl) return { ...entry.data, cached: true };
      if (!pending.has(key)) pending.set(key, load(latitude, longitude).then((data) => {
        cache.delete(key);
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(key, { data, time: now() });
        return data;
      }).finally(() => pending.delete(key)));
      return { ...await pending.get(key), cached: false };
    },
  };
}
