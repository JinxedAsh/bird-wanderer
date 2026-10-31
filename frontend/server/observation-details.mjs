import { randomUUID } from 'node:crypto';
import { validPoint, weatherQuery, weatherFailure } from './observation-weather.mjs';

export function observationDetails(db, weather, now) {
  db.exec(`CREATE TABLE IF NOT EXISTS observation_details (
    observation_id TEXT PRIMARY KEY REFERENCES observations(id) ON DELETE CASCADE,
    location_json TEXT, conditions_json TEXT, utc_offset TEXT
  ); CREATE TABLE IF NOT EXISTS observation_conditions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_json TEXT NOT NULL, snapshot_json TEXT NOT NULL, created_at INTEGER NOT NULL
  );`);
  if (!db.prepare('PRAGMA table_info(observation_details)').all().some(column => column.name === 'utc_offset')) db.exec('ALTER TABLE observation_details ADD COLUMN utc_offset TEXT');
  const location = (value) => {
    if (!value || !validPoint(value) || !['manual', 'exif', 'map'].includes(value.source) || typeof value.label !== 'string' || value.label.trim().length > 120 || /[\x00-\x1f]/.test(value.label)) throw weatherFailure(400, 'Choose a valid map point or manual coordinates and a label up to 120 characters.');
    return { latitude: value.latitude, longitude: value.longitude, label: value.label.trim(), source: value.source };
  };
  return {
    location,
    checkExif(point, media) { if (point?.source === 'exif' && (!Number.isFinite(media.latitude) || !Number.isFinite(media.longitude) || Math.abs(point.latitude - media.latitude) > 0.0000001 || Math.abs(point.longitude - media.longitude) > 0.0000001)) throw weatherFailure(400, 'EXIF location must match this photograph. Use manual coordinates for an override.'); },
    offset(value) { if (value == null || value === '') return null; if (typeof value !== 'string' || !/^[+-](?:0\d|1[0-3]):[0-5]\d$|^[+-]14:00$/.test(value)) throw weatherFailure(400, 'Choose a valid UTC offset or leave it unknown.'); return value; },
    get(id) { const row = db.prepare('SELECT * FROM observation_details WHERE observation_id=?').get(id); return { location: row?.location_json ? JSON.parse(row.location_json) : null, conditions: row?.conditions_json ? JSON.parse(row.conditions_json) : null, utcOffset: row?.utc_offset || null }; },
    save(id, point, conditions, offset = null) { db.prepare('INSERT INTO observation_details (observation_id,location_json,conditions_json,utc_offset) VALUES (?,?,?,?) ON CONFLICT(observation_id) DO UPDATE SET location_json=excluded.location_json,conditions_json=excluded.conditions_json,utc_offset=excluded.utc_offset').run(id, point ? JSON.stringify(point) : null, conditions ? JSON.stringify(conditions) : null, offset); },
    conditions(id, user, point, observedAt, utcOffset) {
      if (!id) return null;
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) throw weatherFailure(400, 'Choose valid conditions or save without them.');
      const row = db.prepare('SELECT * FROM observation_conditions WHERE id=? AND user_id=?').get(id, user);
      if (!row || row.created_at < now() - 24 * 3600000 || row.query_json !== JSON.stringify(weatherQuery({ ...point, observedAt, utcOffset }, now()))) throw weatherFailure(400, 'Conditions no longer match this location/date/time. Refresh conditions or save without them.');
      return JSON.parse(row.snapshot_json);
    },
    async preview(user, input) {
      const query = weatherQuery(input, now());
      const time = now(), key = `observation-weather:${user}`;
      db.prepare('DELETE FROM auth_limits WHERE resets_at<=?').run(time);
      const limit = db.prepare('SELECT attempts FROM auth_limits WHERE key=?').get(key);
      if (limit?.attempts >= 20) throw weatherFailure(429, 'Too many weather lookups. Please wait a minute.');
      db.prepare('INSERT INTO auth_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').run(key, time + 60000);
      const conditions = await weather.load(query);
      db.prepare('DELETE FROM observation_conditions WHERE created_at<?').run(now() - 24 * 3600000);
      // Bound persisted previews per account independently of successful edits.
      db.prepare('DELETE FROM observation_conditions WHERE user_id=? AND id NOT IN (SELECT id FROM observation_conditions WHERE user_id=? ORDER BY created_at DESC LIMIT 19)').run(user, user);
      const conditionsId = randomUUID();
      db.prepare('INSERT INTO observation_conditions VALUES (?,?,?,?,?)').run(conditionsId, user, JSON.stringify(query), JSON.stringify(conditions), now());
      return { conditionsId, conditions };
    },
  };
}
