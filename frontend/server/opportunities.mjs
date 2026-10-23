import { randomUUID } from 'node:crypto';

export function localClock(time, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(time));
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}
const minutes = (value) => Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));

// The same preparation heuristics shown on hotspot weather, never a species-success model.
export function forecastWindows(weather, now = Date.now()) {
  if (
    weather?.source !== 'Open-Meteo' ||
    !Array.isArray(weather.hourly) ||
    !Array.isArray(weather.days) ||
    !Number.isFinite(Date.parse(weather.fetchedAt)) ||
    now - Date.parse(weather.fetchedAt) > 20 * 60000 ||
    Date.parse(weather.fetchedAt) > now + 60000
  )
    return [];
  let clock;
  try {
    clock = localClock(now, weather.timezone);
  } catch {
    return [];
  }
  const valid = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}:00Z`)) &&
    new Date(`${value}:00Z`).toISOString().slice(0, 16) === value;
  const seen = new Set(),
    result = [];
  for (const hour of weather.hourly.slice(0, 24)) {
    if (
      !hour ||
      !valid(hour.time) ||
      hour.time <= clock ||
      Date.parse(`${hour.time}:00Z`) - Date.parse(`${clock}:00Z`) > 86400000 ||
      typeof hour.rainProbability !== 'number' ||
      !Number.isFinite(hour.rainProbability) ||
      hour.rainProbability < 0 ||
      hour.rainProbability > 20 ||
      typeof hour.windKmh !== 'number' ||
      !Number.isFinite(hour.windKmh) ||
      hour.windKmh < 0 ||
      hour.windKmh > 15
    )
      continue;
    const day = weather.days.find((day) => day?.date === hour.time.slice(0, 10));
    if (
      !day ||
      !valid(day.sunrise) ||
      !valid(day.sunset) ||
      !day.sunrise.startsWith(day.date) ||
      !day.sunset.startsWith(day.date)
    )
      continue;
    const minute = minutes(hour.time),
      rise = minutes(day.sunrise),
      set = minutes(day.sunset);
    if (rise >= set || !((minute >= rise && minute <= rise + 60) || (minute >= set - 60 && minute <= set)))
      continue;
    // Forecasts already expose the next24 hourly rows; keep one qualifying slot per local day.
    if (seen.has(day.date)) continue;
    seen.add(day.date);
    result.push({ ...hour, date: day.date });
  }
  return result;
}

export function createOpportunities(db, discovery, { enqueue }, now = Date.now) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS opportunity_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,enabled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS opportunity_alerts (
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hotspot_id TEXT NOT NULL,hotspot_name TEXT NOT NULL,day TEXT NOT NULL,forecast_time TEXT NOT NULL,
      timezone TEXT NOT NULL,rain REAL NOT NULL,wind REAL NOT NULL,fetched_at TEXT NOT NULL,
      created_at INTEGER NOT NULL,read_at INTEGER,UNIQUE(user_id,hotspot_id,day)
    );
    CREATE TABLE IF NOT EXISTS opportunity_checks (
      hotspot_id TEXT PRIMARY KEY,checked_at INTEGER NOT NULL,status TEXT NOT NULL
    );
  `);
  const enabled = (user) =>
    !!db.prepare('SELECT enabled FROM opportunity_preferences WHERE user_id=?').get(user)?.enabled;
  const canRead = (row, user) =>
    !!row &&
    row.user_id === user &&
    enabled(user) &&
    !!db
      .prepare("SELECT 1 FROM alert_subscriptions WHERE user_id=? AND kind='hotspot' AND item_id=?")
      .get(user, row.hotspot_id) &&
    row.forecast_time > localClock(now(), row.timezone);
  const serialize = (row, user) =>
    canRead(row, user)
      ? {
          id: `opportunity:${row.id}`,
          opportunityId: row.id,
          hotspotId: row.hotspot_id,
          title: `Forecast light window · ${row.hotspot_name}`,
          description: `${row.forecast_time.replace('T', ' ')} (${row.timezone}) · rain ${row.rain}% · wind ${row.wind} km/h. General preparation rule, not bird activity or guaranteed conditions. Confirm site access. Open-Meteo forecast retrieved ${row.fetched_at}.`,
          timeAgo: `${new Date(row.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })} IST`,
          createdAt: new Date(row.created_at).toISOString(),
          category: 'alerts',
          isUnread: row.read_at === null,
          icon: 'wb_twilight',
          iconBg: 'bg-[#ffdcc3]',
          iconColor: 'text-[#6e3900]',
        }
      : null;
  let running = false;
  const check = async () => {
    if (running || typeof discovery.hotspotWeather !== 'function') return;
    running = true;
    try {
      const points = db
        .prepare(
          `SELECT DISTINCT s.item_id FROM alert_subscriptions s
        JOIN profiles p ON p.user_id=s.user_id AND p.push_enabled=1
        JOIN opportunity_preferences f ON f.user_id=s.user_id AND f.enabled=1
        LEFT JOIN opportunity_checks c ON c.hotspot_id=s.item_id
        WHERE s.kind='hotspot' AND (c.checked_at IS NULL OR c.checked_at<=?)
        ORDER BY COALESCE(c.checked_at,0),s.item_id LIMIT 20`,
        )
        .all(now() - 3600000);
      for (const { item_id: id } of points) {
        try {
          const weather = await discovery.hotspotWeather(id),
            slots = forecastWindows(weather, now());
          const catalogue = await discovery.catalogue(),
            hotspot = catalogue.hotspots.find((point) => point.id === id);
          if (!hotspot) throw new Error('Hotspot no longer loaded');
          const users = db
            .prepare(
              `SELECT s.user_id FROM alert_subscriptions s
            JOIN profiles p ON p.user_id=s.user_id AND p.push_enabled=1
            JOIN opportunity_preferences f ON f.user_id=s.user_id AND f.enabled=1
            WHERE s.kind='hotspot' AND s.item_id=?`,
            )
            .all(id);
          db.exec('BEGIN');
          try {
            for (const { user_id: user } of users)
              for (const slot of slots) {
                const key = randomUUID();
                const inserted = db
                  .prepare('INSERT OR IGNORE INTO opportunity_alerts VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL)')
                  .run(
                    key,
                    user,
                    id,
                    hotspot.name,
                    slot.date,
                    slot.time,
                    weather.timezone,
                    slot.rainProbability,
                    slot.windKmh,
                    weather.fetchedAt,
                    now(),
                  );
                if (inserted.changes) enqueue(key);
              }
            db.prepare(
              "INSERT INTO opportunity_checks VALUES (?,?,'ok') ON CONFLICT(hotspot_id) DO UPDATE SET checked_at=excluded.checked_at,status='ok'",
            ).run(id, now());
            db.exec('COMMIT');
          } catch (error) {
            db.exec('ROLLBACK');
            throw error;
          }
        } catch {
          // Keep existing sourced records; do not manufacture a favorable forecast on failure.
          db.prepare(
            "INSERT INTO opportunity_checks VALUES (?,?,'unavailable') ON CONFLICT(hotspot_id) DO UPDATE SET checked_at=excluded.checked_at,status='unavailable'",
          ).run(id, now());
        }
      }
    } finally {
      running = false;
    }
  };
  return { enabled, canRead, serialize, check };
}
