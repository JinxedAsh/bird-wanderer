import { readFileSync, realpathSync } from 'node:fs';
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

export function createPush(db, { canRead, observation }, options = {}, now = Date.now) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_devices (
      token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS push_deliveries (
      alert_id TEXT NOT NULL REFERENCES sighting_alerts(id) ON DELETE CASCADE,
      device_token TEXT NOT NULL REFERENCES push_devices(token) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL,last_code TEXT NOT NULL DEFAULT '',PRIMARY KEY(alert_id,device_token)
    );
  `);
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
  let running = false;
  const dispatch = async () => {
    if (!configured || running) return { sent: 0 };
    running = true;
    let sent = 0;
    try {
      const rows = db
        .prepare(
          `SELECT d.*,a.user_id,a.observation_id,a.created_at,a.read_at,v.user_id AS device_owner,s.expires_at
        FROM push_deliveries d JOIN sighting_alerts a ON a.id=d.alert_id JOIN push_devices v ON v.token=d.device_token
        JOIN sessions s ON s.token_hash=v.session_hash
        WHERE d.status='pending' AND d.next_attempt_at<=? ORDER BY d.next_attempt_at LIMIT 50`,
        )
        .all(now());
      for (const row of rows) {
        // Earlier sends await the network; logout/read changes may have happened since the batch query.
        const current = db
          .prepare(
            `SELECT v.user_id,s.expires_at,a.read_at FROM push_devices v
          JOIN sessions s ON s.token_hash=v.session_hash JOIN sighting_alerts a ON a.id=?
          WHERE v.token=?`,
          )
          .get(row.alert_id, row.device_token);
        if (!current) continue;
        const sighting = observation(row.observation_id);
        const subscribed =
          !!sighting &&
          !!db
            .prepare(
              `SELECT 1 FROM alert_subscriptions WHERE user_id=? AND
          ((kind='species' AND item_id=?) OR (kind='hotspot' AND item_id=?))`,
            )
            .get(row.user_id, sighting.species_id, sighting.hotspot_id);
        const enabled = db
          .prepare('SELECT push_enabled FROM profiles WHERE user_id=?')
          .get(row.user_id)?.push_enabled;
        if (
          !enabled ||
          !subscribed ||
          current.expires_at <= now() ||
          current.user_id !== row.user_id ||
          current.read_at !== null ||
          now() - row.created_at > 86400000 ||
          !canRead(sighting, row.user_id)
        ) {
          db.prepare(
            "UPDATE push_deliveries SET status='skipped',last_code='no-longer-eligible' WHERE alert_id=? AND device_token=?",
          ).run(row.alert_id, row.device_token);
          continue;
        }
        db.prepare('UPDATE push_deliveries SET attempts=attempts+1 WHERE alert_id=? AND device_token=?').run(
          row.alert_id,
          row.device_token,
        );
        try {
          // A lock-screen copy cannot be revoked later: no species, photo, coordinates or location leave the app.
          await options.send({
            token: row.device_token,
            data: {
              kind: 'sighting',
              title: 'Bird Wanderer',
              body: 'New subscribed activity. Open the app to check current access.',
            },
            android: { ttl: 3600000 },
            webpush: { headers: { TTL: '3600' } },
          });
          db.prepare(
            "UPDATE push_deliveries SET status='sent',last_code='provider-accepted' WHERE alert_id=? AND device_token=?",
          ).run(row.alert_id, row.device_token);
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
            db.prepare(
              'UPDATE push_deliveries SET status=?,next_attempt_at=?,last_code=? WHERE alert_id=? AND device_token=?',
            ).run(
              row.attempts + 1 >= 5 ? 'failed' : 'pending',
              now() + 60000 * 2 ** row.attempts,
              code,
              row.alert_id,
              row.device_token,
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
    dispatch,
    publicConfig: () =>
      configured
        ? {
            configured: true,
            webConfig: options.webConfig,
            vapidKey: options.vapidKey,
            message:
              'Firebase configured. Enable push on this browser to register a device; delivery still requires permission and network.',
          }
        : {
            configured: false,
            message:
              'In-app alerts are available. Firebase push is not configured; device delivery is not enabled.',
          },
  };
}
