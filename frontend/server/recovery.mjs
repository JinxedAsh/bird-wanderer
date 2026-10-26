import { createHash, randomBytes } from 'node:crypto';
import { plainMailbox } from './recovery-mail.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const message = 'If an eligible account exists and delivery succeeds, a reset link will arrive by email. Check spam too. Only the latest link works for 15 minutes.';

export function registerRecovery(app, db, { now, origin, allowedOrigins, mail, hashPassword, rateLimit }) {
  db.exec(`CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    credential_version TEXT NOT NULL, expires_at INTEGER NOT NULL
  );`);
  const resetOrigin = mail?.origin || origin;
  const parsed = new URL(resetOrigin);
  if (parsed.origin !== resetOrigin || !allowedOrigins.has(resetOrigin) || !['http:', 'https:'].includes(parsed.protocol)) throw new Error('RECOVERY_ORIGIN must be an exact allowed application origin.');
  let active = 0;
  const limited = (phase, maximum) => (req, res, next) => {
    const time = now();
    db.prepare('DELETE FROM auth_limits WHERE resets_at <= ?').run(time);
    const identity = phase === 'request' ? String(req.body?.email || '').trim().toLowerCase() : String(req.body?.token || '');
    const keys = [`recovery:${phase}:ip:${req.ip}`, `recovery:${phase}:value:${digest(identity)}`];
    for (const key of keys) {
      const limit = db.prepare('SELECT attempts,resets_at FROM auth_limits WHERE key=?').get(key);
      if (limit && limit.attempts >= Math.min(maximum, rateLimit)) {
        res.set('Retry-After', String(Math.ceil((limit.resets_at - time) / 1000)));
        return res.status(429).json({ error: 'Too many recovery attempts. Please try again in 15 minutes.' });
      }
    }
    for (const key of keys) db.prepare('INSERT INTO auth_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').run(key, time + 15 * 60 * 1000);
    next();
  };
  app.post('/api/auth/recovery/request', limited('request', 5), (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!plainMailbox(email)) return res.status(400).json({ error: 'Enter one plain account email address, without a display name or address list.' });
    if (!mail?.send) return res.status(503).json({ error: 'Email recovery is not configured. No reset email has been sent.' });
    if (active >= 3) return res.status(503).json({ error: 'Recovery requests are busy. Please try again shortly.' });
    db.prepare('DELETE FROM password_resets WHERE expires_at <= ?').run(now());
    const user = db.prepare('SELECT id,password_hash FROM users WHERE email=?').get(email);
    const token = randomBytes(32).toString('hex');
    const tokenHash = digest(token);
    if (user) db.prepare(`INSERT INTO password_resets VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
      token_hash=excluded.token_hash,credential_version=excluded.credential_version,expires_at=excluded.expires_at`).run(tokenHash, user.id, digest(user.password_hash), now() + 15 * 60 * 1000);
    // Do not wait on SMTP for only existing accounts: use the same generic
    // response path. This bounded in-process dispatch is not a durable mail queue.
    active++;
    setImmediate(() => { void (async () => {
      try {
        if (user && db.prepare('SELECT 1 FROM password_resets WHERE token_hash=? AND expires_at>?').get(tokenHash, now()))
          await mail.send({ email, url: `${resetOrigin}/#reset-password=${token}` });
      } catch {
        try { db.prepare('DELETE FROM password_resets WHERE token_hash=?').run(tokenHash); } catch { /* App may be shutting down. */ }
        console.error('Password recovery mail failed; request a new link.');
      } finally { active--; }
    })(); });
    res.status(202).json({ message });
  });
  app.post('/api/auth/recovery/reset', limited('reset', 30), (req, res, next) => { void (async () => {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new link.' });
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) return res.status(400).json({ error: 'Use a new password of 12–128 characters.' });
    const tokenHash = digest(token);
    const load = () => db.prepare(`SELECT r.user_id,r.credential_version,u.password_hash FROM password_resets r JOIN users u ON u.id=r.user_id WHERE r.token_hash=? AND r.expires_at>?`).get(tokenHash, now());
    const row = load();
    if (!row || row.credential_version !== digest(row.password_hash)) return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new link.' });
    const credentials = await hashPassword(password);
    const current = load();
    if (!current || current.credential_version !== digest(current.password_hash) || current.password_hash !== row.password_hash) return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new link.' });
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=?').run(credentials.hash, credentials.salt, row.user_id);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);
      db.prepare('DELETE FROM password_resets WHERE user_id=?').run(row.user_id);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    // No auto-login and no cookie clearing: another account may be signed in.
    res.json({ reset: true });
  })().catch(next); });
}
