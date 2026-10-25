import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

// Only these public Firebase fields may be returned to the browser.
export async function configuredPush(env = process.env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_PATH || !env.FIREBASE_WEB_CONFIG || !env.FIREBASE_VAPID_PUBLIC_KEY)
    return {};
  const input = JSON.parse(env.FIREBASE_WEB_CONFIG);
  const webConfig = {};
  for (const key of ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId']) {
    if (typeof input[key] !== 'string' || !input[key] || input[key].length > 300)
      throw new Error('Invalid FIREBASE_WEB_CONFIG');
    webConfig[key] = input[key];
  }
  if (!/^[A-Za-z0-9_-]{80,200}$/.test(env.FIREBASE_VAPID_PUBLIC_KEY))
    throw new Error('Invalid FIREBASE_VAPID_PUBLIC_KEY');
  const credentialPath = realpathSync(env.FIREBASE_SERVICE_ACCOUNT_PATH);
  const within = relative(fileURLToPath(new URL('../../', import.meta.url)), credentialPath);
  if (!within.startsWith('..') && !isAbsolute(within))
    throw new Error('Firebase service-account JSON must be stored outside the repository');
  const account = JSON.parse(readFileSync(credentialPath, 'utf8'));
  if (account.project_id !== webConfig.projectId)
    throw new Error('Firebase web and service-account projects must match');
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getMessaging } = await import('firebase-admin/messaging');
  const app = initializeApp({ credential: cert(account) }, 'bird-wanderer-push');
  const messaging = getMessaging(app);
  return { webConfig, vapidKey: env.FIREBASE_VAPID_PUBLIC_KEY, send: (message) => messaging.send(message) };
}

export function createPush(db, { canRead, observation, opportunityCanRead }, options = {}, now = Date.now) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_devices (
      token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,created_at INTEGER NOT NULL
    );
  `);
  const deliveryTable = (name) => `CREATE TABLE ${name} (
    id INTEGER PRIMARY KEY,alert_id TEXT REFERENCES sighting_alerts(id) ON DELETE CASCADE,
    opportunity_id TEXT REFERENCES opportunity_alerts(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL REFERENCES push_devices(token) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at INTEGER NOT NULL,last_code TEXT NOT NULL DEFAULT '',
    CHECK((alert_id IS NULL)!=(opportunity_id IS NULL))
  )`;
  const columns = db.prepare('PRAGMA table_info(push_deliveries)').all();
  if (!columns.length) db.exec(deliveryTable('push_deliveries'));
  else if (!columns.some((row) => row.name === 'opportunity_id')) {
    // Preserve delivery statuses/attempts while allowing either notification source.
    db.exec('BEGIN');
    try {
      db.exec(deliveryTable('push_deliveries_next'));
      db.exec(`INSERT INTO push_deliveries_next(alert_id,device_token,status,attempts,next_attempt_at,last_code)
        SELECT alert_id,device_token,status,attempts,next_attempt_at,last_code FROM push_deliveries`);
      db.exec(
        'DROP TABLE push_deliveries; ALTER TABLE push_deliveries_next RENAME TO push_deliveries; COMMIT',
      );
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS push_sighting_device ON push_deliveries(alert_id,device_token) WHERE alert_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS push_opportunity_device ON push_deliveries(opportunity_id,device_token) WHERE opportunity_id IS NOT NULL;`);
  if (
    !db
      .prepare('PRAGMA table_info(push_devices)')
      .all()
      .some((row) => row.name === 'session_hash')
  ) {
    db.exec(
      'ALTER TABLE push_devices ADD COLUMN session_hash TEXT REFERENCES sessions(token_hash) ON DELETE CASCADE',
    );
    db.prepare('DELETE FROM push_devices WHERE session_hash IS NULL').run();
  }
  const configured = typeof options.send === 'function' && !!options.webConfig && !!options.vapidKey;
  const enqueue = (alertId) => {
    if (!configured) return;
    const alert = db.prepare('SELECT user_id FROM sighting_alerts WHERE id=?').get(alertId);
    if (!alert) return;
    db.prepare(
      `INSERT OR IGNORE INTO push_deliveries(alert_id,device_token,next_attempt_at)
      SELECT ?,token,? FROM push_devices WHERE user_id=?`,
    ).run(alertId, now(), alert.user_id);
  };
  const enqueueOpportunity = (id) => {
    if (!configured) return;
    const alert = db.prepare('SELECT user_id FROM opportunity_alerts WHERE id=?').get(id);
    if (alert)
      db.prepare(
        `INSERT OR IGNORE INTO push_deliveries(opportunity_id,device_token,next_attempt_at)
      SELECT ?,token,? FROM push_devices WHERE user_id=?`,
      ).run(id, now(), alert.user_id);
  };
  let running = false;
  const dispatch = async () => {
    if (!configured || running) return { sent: 0 };
    running = true;
    let sent = 0;
    try {
      const rows = db
        .prepare(
          "SELECT * FROM push_deliveries WHERE status='pending' AND next_attempt_at<=? ORDER BY next_attempt_at,id LIMIT 50",
        )
        .all(now());
      for (const row of rows) {
        // Each earlier send awaited the network, so re-read session, alert and privacy now.
        const device = db
          .prepare(
            `SELECT v.user_id,v.session_hash,s.expires_at FROM push_devices v JOIN sessions s ON s.token_hash=v.session_hash WHERE v.token=?`,
          )
          .get(row.device_token);
        const alert = row.alert_id
          ? db.prepare('SELECT * FROM sighting_alerts WHERE id=?').get(row.alert_id)
          : db.prepare('SELECT * FROM opportunity_alerts WHERE id=?').get(row.opportunity_id);
        if (!device || !alert) continue;
        const enabled = db
          .prepare('SELECT push_enabled FROM profiles WHERE user_id=?')
          .get(alert.user_id)?.push_enabled;
        let eligible = false;
        if (row.alert_id) {
          const sighting = observation(alert.observation_id);
          const subscribed =
            !!sighting &&
            !!db
              .prepare(
                `SELECT 1 FROM alert_subscriptions WHERE user_id=? AND
            ((kind='species' AND item_id=?) OR (kind='hotspot' AND item_id=?))`,
              )
              .get(alert.user_id, sighting.species_id, sighting.hotspot_id);
          eligible = subscribed && canRead(sighting, alert.user_id);
        } else eligible = !!opportunityCanRead?.(alert, alert.user_id);
        if (
          !enabled ||
          device.expires_at <= now() ||
          device.user_id !== alert.user_id ||
          alert.read_at !== null ||
          now() - alert.created_at > 86400000 ||
          !eligible
        ) {
          db.prepare(
            "UPDATE push_deliveries SET status='skipped',last_code='no-longer-eligible' WHERE id=?",
          ).run(row.id);
          continue;
        }
        db.prepare('UPDATE push_deliveries SET attempts=attempts+1 WHERE id=?').run(row.id);
        try {
          // A lock-screen copy cannot be revoked later: no species, photo, coordinates or location leave the app.
          await options.send({
            token: row.device_token,
            data: {
              kind: row.alert_id ? 'sighting' : 'forecast',
              title: 'Bird Wanderer',
              body: 'New subscribed activity. Open the app to check current access.',
              // Opaque double-hash lets Android discard already-in-flight events
              // after a server/account/session change without exposing a cookie.
              binding: createHash('sha256').update(device.session_hash).digest('hex'),
              project: options.webConfig.projectId,
            },
            android: { ttl: 3600000, priority: 'high' },
            webpush: { headers: { TTL: '3600' } },
          });
          db.prepare("UPDATE push_deliveries SET status='sent',last_code='provider-accepted' WHERE id=?").run(
            row.id,
          );
          sent++;
        } catch (error) {
          const code = [
            'messaging/registration-token-not-registered',
            'messaging/invalid-registration-token',
          ].includes(error?.code)
            ? 'invalid-token'
            : 'provider-error';
          if (code === 'invalid-token')
            db.prepare('DELETE FROM push_devices WHERE token=?').run(row.device_token);
          else
            db.prepare('UPDATE push_deliveries SET status=?,next_attempt_at=?,last_code=? WHERE id=?').run(
              row.attempts + 1 >= 5 ? 'failed' : 'pending',
              now() + 60000 * 2 ** row.attempts,
              code,
              row.id,
            );
        }
      }
    } finally {
      running = false;
    }
    return { sent };
  };
  return {
    configured,
    enqueue,
    enqueueOpportunity,
    dispatch,
    publicConfig: () =>
      configured
        ? {
            configured: true,
            webConfig: options.webConfig,
            vapidKey: options.vapidKey,
            message:
              'Firebase configured. Enable push on this device; matching client setup, permission and network are still required.',
          }
        : {
            configured: false,
            message:
              'In-app alerts are available. Firebase push is not configured; device delivery is not enabled.',
          },
  };
}
