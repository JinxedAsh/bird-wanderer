import { Router } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { createPush } from './push.mjs';
import { createOpportunities } from './opportunities.mjs';

// Alert rows store references, not copies of private sighting data.
export function createAlerts(db, discovery, { observation, canRead }, now = Date.now, pushOptions = {}, socialNotifications) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_subscriptions (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK(kind IN ('species','hotspot')), item_id TEXT NOT NULL,
      label TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(user_id,kind,item_id)
    );
    CREATE TABLE IF NOT EXISTS sighting_alerts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL, read_at INTEGER, UNIQUE(user_id,observation_id)
    );
    CREATE INDEX IF NOT EXISTS sighting_alerts_owner ON sighting_alerts(user_id,created_at);
    CREATE TABLE IF NOT EXISTS alert_limits (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      started_at INTEGER NOT NULL, attempts INTEGER NOT NULL
    );
  `);
  // Matching is invoked only after both services are initialized.
  let push;
  const opportunities = createOpportunities(
    db,
    discovery,
    { enqueue: (id) => push.enqueueOpportunity(id) },
    now,
  );
  push = createPush(
    db,
    { observation, canRead, opportunityCanRead: opportunities.canRead },
    pushOptions,
    now,
  );
  const subscriptions = (user) =>
    db
      .prepare(
        'SELECT kind,item_id AS id,label FROM alert_subscriptions WHERE user_id=? ORDER BY created_at DESC',
      )
      .all(user);
  const queue = (row) => {
    const recipients = db
      .prepare(
        `SELECT DISTINCT s.user_id FROM alert_subscriptions s
      JOIN profiles p ON p.user_id=s.user_id AND p.push_enabled=1
      WHERE (s.kind='species' AND s.item_id=?) OR (s.kind='hotspot' AND s.item_id=?)`,
      )
      .all(row.species_id, row.hotspot_id);
    for (const { user_id: user } of recipients) {
      if (user === row.user_id || !canRead(row, user)) continue;
      const alertId = randomUUID();
      const inserted = db
        .prepare('INSERT OR IGNORE INTO sighting_alerts VALUES (?,?,?,?,NULL)')
        .run(alertId, user, row.id, now());
      if (inserted.changes) push.enqueue(alertId);
    }
  };
  const visibleAlert = (row, user) => {
    const sighting = observation(row.observation_id);
    if (!canRead(sighting, user)) return null;
    const hidden =
      db.prepare('SELECT location_privacy FROM profiles WHERE user_id=?').get(sighting.user_id)
        ?.location_privacy === 'hide';
    return {
      id: row.id,
      observationId: sighting.id,
      speciesId: sighting.species_id,
      hotspotId: hidden ? null : sighting.hotspot_id,
      title: `New ${sighting.species_name} report`,
      description: `User-reported sighting · ${hidden ? 'Location withheld' : sighting.hotspot_name}. Capture time is unverified; open the hotspot for current forecasts.`,
      timeAgo: `${new Date(row.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })} IST`,
      createdAt: new Date(row.created_at).toISOString(),
      category: 'alerts',
      isUnread: row.read_at === null,
      icon: 'flutter_dash',
      iconBg: 'bg-[#c7ecce]',
      iconColor: 'text-[#154212]',
      thumbnail: `/api/observations/media/${sighting.media_id}`,
    };
  };
  const router = Router();
  router.use((req, res, next) => {
    if (['GET', 'HEAD'].includes(req.method)) return next();
    const time = now(),
      row = db.prepare('SELECT * FROM alert_limits WHERE user_id=?').get(req.userId);
    if (row && time - row.started_at < 60000 && row.attempts >= 60)
      return res
        .status(429)
        .set('Retry-After', '60')
        .json({ error: 'Too many alert changes. Try again in a minute.' });
    db.prepare(
      `INSERT INTO alert_limits VALUES (?,?,1) ON CONFLICT(user_id) DO UPDATE SET
      attempts=CASE WHEN ?-started_at>=60000 THEN 1 ELSE attempts+1 END,
      started_at=CASE WHEN ?-started_at>=60000 THEN ? ELSE started_at END`,
    ).run(req.userId, time, time, time, time);
    next();
  });
  router.get('/', (req, res) => {
    const rows = db
      .prepare('SELECT * FROM sighting_alerts WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 200')
      .all(req.userId);
    res.json({
      subscriptions: subscriptions(req.userId),
      notifications: [
        ...(socialNotifications?.list(req.userId)||[]),
        ...rows.map((row) => visibleAlert(row, req.userId)),
        ...db
          .prepare('SELECT * FROM opportunity_alerts WHERE user_id=? ORDER BY created_at DESC LIMIT 200')
          .all(req.userId)
          .map((row) => opportunities.serialize(row, req.userId)),
      ]
        .filter(Boolean)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 200),
      opportunity: {
        enabled: opportunities.enabled(req.userId),
        checks: db
          .prepare(
            `SELECT c.hotspot_id AS id,c.checked_at AS checkedAt,c.status FROM opportunity_checks c JOIN alert_subscriptions s ON s.item_id=c.hotspot_id AND s.kind='hotspot' WHERE s.user_id=?`,
          )
          .all(req.userId),
      },
      push: {
        ...push.publicConfig(),
        deviceRegistered: !!db
          .prepare('SELECT 1 FROM push_devices WHERE user_id=? AND session_hash=?')
          .get(req.userId, req.sessionHash),
      },
    });
  });
  router.put('/opportunity', (req, res) => {
    if (typeof req.body?.enabled !== 'boolean')
      return res.status(400).json({ error: 'Choose whether to receive forecast opportunities.' });
    db.prepare(
      'INSERT INTO opportunity_preferences VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled',
    ).run(req.userId, Number(req.body.enabled));
    res.status(204).end();
  });
  router.get('/push/config', (_req, res) => res.json(push.publicConfig()));
  router.put('/push/device', (req, res) => {
    if(req.body?.userId!==undefined&&req.body.userId!==req.userId)
      return res.status(409).json({error:'Your account changed. Refresh Notifications before retrying push.'});
    if(req.body?.binding!==undefined&&req.body.binding!==createHash('sha256').update(req.sessionHash).digest('hex'))
      return res.status(409).json({error:'Your session changed. Refresh Notifications before retrying push.'});
    if (!push.configured) return res.status(503).json({ error: 'Firebase push is not configured.' });
    const token = req.body?.token;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_:\-]{20,4096}$/.test(token))
      return res.status(400).json({ error: 'Invalid device token.' });
    const existing = db.prepare('SELECT * FROM push_devices WHERE token=?').get(token);
    if (
      existing?.user_id !== req.userId &&
      db.prepare('SELECT COUNT(*) AS count FROM push_devices WHERE user_id=?').get(req.userId).count >= 5
    )
      return res
        .status(409)
        .json({ error: 'Five push devices already registered. Disable another device first.' });
    if (existing && (existing.user_id !== req.userId || existing.session_hash !== req.sessionHash))
      db.prepare('DELETE FROM push_devices WHERE token=?').run(token);
    db.prepare(
      'INSERT INTO push_devices(token,user_id,session_hash,created_at) VALUES (?,?,?,?) ON CONFLICT(token) DO UPDATE SET created_at=excluded.created_at',
    ).run(token, req.userId, req.sessionHash, now());
    res.status(204).end();
  });
  router.delete('/push/device', (req, res) => {
    if(req.body?.userId!==undefined&&req.body.userId!==req.userId)
      return res.status(409).json({error:'Your account changed. Refresh Notifications before retrying push.'});
    if(req.body?.binding!==undefined&&req.body.binding!==createHash('sha256').update(req.sessionHash).digest('hex'))
      return res.status(409).json({error:'Your session changed. Refresh Notifications before retrying push.'});
    db.prepare('DELETE FROM push_devices WHERE user_id=? AND session_hash=?').run(
      req.userId,
      req.sessionHash,
    );
    res.status(204).end();
  });
  router.put('/subscriptions/:kind/:id', async (req, res, next) => {
    try {
      const { kind, id } = req.params;
      if (!['species', 'hotspot'].includes(kind) || typeof req.body?.enabled !== 'boolean' || id.length > 80)
        return res.status(400).json({ error: 'Choose a valid subscription and enabled state.' });
      if (req.body.enabled) {
        const catalogue = await discovery.catalogue();
        const item = (kind === 'species' ? catalogue.species : catalogue.hotspots).find(
          (item) => item.id === id,
        );
        if (!item) return res.status(404).json({ error: 'Item not found in the discovery catalogue.' });
        const existing = db
          .prepare('SELECT 1 FROM alert_subscriptions WHERE user_id=? AND kind=? AND item_id=?')
          .get(req.userId, kind, id);
        if (
          !existing &&
          db.prepare('SELECT COUNT(*) AS count FROM alert_subscriptions WHERE user_id=?').get(req.userId)
            .count >= 100
        )
          return res.status(409).json({ error: 'Your 100 subscription limit is reached. Remove one first.' });
        db.prepare('INSERT OR IGNORE INTO alert_subscriptions VALUES (?,?,?,?,?)').run(
          req.userId,
          kind,
          id,
          item.name,
          now(),
        );
      } else
        db.prepare('DELETE FROM alert_subscriptions WHERE user_id=? AND kind=? AND item_id=?').run(
          req.userId,
          kind,
          id,
        );
      res.json({ subscriptions: subscriptions(req.userId) });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  });
  router.post('/read', (req, res) => {
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE sighting_alerts SET read_at=? WHERE user_id=? AND read_at IS NULL').run(
        now(),
        req.userId,
      );
      db.prepare('UPDATE opportunity_alerts SET read_at=? WHERE user_id=? AND read_at IS NULL').run(
        now(),
        req.userId,
      );
      socialNotifications?.readAll(req.userId);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    res.status(204).end();
  });
  router.post('/:id/read', (req, res) => {
    if(req.params.id.startsWith('social:')){
      if(!socialNotifications?.read(req.params.id.slice(7),req.userId))return res.status(404).json({error:'Social notification is no longer available.'});
      return res.status(204).end();
    }
    if (req.params.id.startsWith('opportunity:')) {
      const row = db
        .prepare('SELECT * FROM opportunity_alerts WHERE id=? AND user_id=?')
        .get(req.params.id.slice(12), req.userId);
      if (!opportunities.canRead(row, req.userId))
        return res.status(404).json({ error: 'Forecast opportunity is no longer available.' });
      db.prepare('UPDATE opportunity_alerts SET read_at=COALESCE(read_at,?) WHERE id=?').run(now(), row.id);
      return res.status(204).end();
    }
    const row = db
      .prepare('SELECT * FROM sighting_alerts WHERE id=? AND user_id=?')
      .get(req.params.id, req.userId);
    if (!row || !visibleAlert(row, req.userId))
      return res.status(404).json({ error: 'Alert is no longer available.' });
    db.prepare('UPDATE sighting_alerts SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?').run(
      now(),
      row.id,
      req.userId,
    );
    res.status(204).end();
  });
  return { router, queue, dispatchPush: push.dispatch, checkOpportunities: opportunities.check };
}
