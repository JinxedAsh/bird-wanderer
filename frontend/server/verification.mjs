import { createHash, randomBytes } from 'node:crypto';
import { plainMailbox } from './recovery-mail.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const invalid = 'This verification link is invalid or expired. Sign in and request a new link in Settings.';

export function registerVerification(app, db, { now, origin, allowedOrigins, mail, requireSession, rateLimit }) {
  // Separate additive tables leave existing user rows and credentials unchanged.
  db.exec(`CREATE TABLE IF NOT EXISTS verified_emails (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, email TEXT NOT NULL, verified_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS email_verifications (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL, expires_at INTEGER NOT NULL
  );`);
  const linkOrigin = mail?.origin || origin;
  const parsed = new URL(linkOrigin);
  if (parsed.origin !== linkOrigin || !allowedOrigins.has(linkOrigin) || !['http:', 'https:'].includes(parsed.protocol))
    throw new Error('Email link origin must be an exact allowed application origin.');
  const isVerified = (id) => !!db.prepare('SELECT 1 FROM verified_emails v JOIN users u ON u.id=v.user_id WHERE v.user_id=? AND v.email=u.email').get(id);
  let active = 0;
  const enqueue = (user) => {
    if (!mail?.sendVerification) return { status: 503, error: 'Email verification is not configured. No verification email has been sent.' };
    if (!plainMailbox(user.email)) return { status: 400, error: 'This account needs one plain email address to receive a verification link.' };
    if (active >= 3) return { status: 503, error: 'Verification requests are busy. Please try again shortly.' };
    db.prepare('DELETE FROM email_verifications WHERE expires_at<=?').run(now());
    const token = randomBytes(32).toString('hex');
    const tokenHash = digest(token);
    db.prepare(`INSERT INTO email_verifications VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
      token_hash=excluded.token_hash,email=excluded.email,expires_at=excluded.expires_at`).run(tokenHash, user.id, user.email, now() + 15 * 60 * 1000);
    active++;
    setImmediate(() => { void (async () => {
      try {
        if (db.prepare('SELECT 1 FROM email_verifications WHERE token_hash=? AND expires_at>?').get(tokenHash, now()))
          await mail.sendVerification({ email: user.email, url: `${linkOrigin}/#verify-email=${token}` });
      } catch {
        try { db.prepare('DELETE FROM email_verifications WHERE token_hash=?').run(tokenHash); } catch { /* Shutdown. */ }
        console.error('Email verification mail failed; request a new link.');
      } finally { active--; }
    })(); });
    return { status: 202, message: 'Verification requested. If delivery succeeds, check your inbox and spam. Only the latest link works, once, for 15 minutes.' };
  };
  const limited = (phase, maximum) => (req, res, next) => {
    const time = now();
    db.prepare('DELETE FROM auth_limits WHERE resets_at<=?').run(time);
    const value = phase === 'resend' ? req.userId : digest(String(req.body?.token || ''));
    const keys = [`verification:${phase}:ip:${req.ip}`, `verification:${phase}:value:${value}`];
    for (const key of keys) {
      const row = db.prepare('SELECT attempts,resets_at FROM auth_limits WHERE key=?').get(key);
      if (row && row.attempts >= Math.min(maximum, rateLimit)) {
        res.set('Retry-After', String(Math.ceil((row.resets_at - time) / 1000)));
        return res.status(429).json({ error: 'Too many verification attempts. Please try again in 15 minutes.' });
      }
    }
    for (const key of keys) db.prepare('INSERT INTO auth_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').run(key, time + 15 * 60 * 1000);
    next();
  };
  app.get('/api/auth/verification/status', requireSession, (req, res) => res.json({ emailVerified: isVerified(req.userId) }));
  app.post('/api/auth/verification/resend', requireSession, limited('resend', 5), (req, res) => {
    if (isVerified(req.userId)) return res.json({ message: 'Your email is already verified.' });
    const user = db.prepare('SELECT id,email FROM users WHERE id=?').get(req.userId);
    const { status, ...body } = enqueue(user);
    res.status(status).json(body);
  });
  // GET is intentionally absent: email scanners must not consume this link.
  app.post('/api/auth/verification/confirm', limited('confirm', 30), (req, res) => {
    const token = req.body?.token;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: invalid });
    const row = db.prepare(`SELECT v.user_id,v.email FROM email_verifications v JOIN users u ON u.id=v.user_id
      WHERE v.token_hash=? AND v.expires_at>? AND v.email=u.email`).get(digest(token), now());
    if (!row) return res.status(400).json({ error: invalid });
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO verified_emails VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at').run(row.user_id, row.email, now());
      db.prepare('DELETE FROM email_verifications WHERE user_id=?').run(row.user_id);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    // Bearer token proves only the emailed account. Never replace a session.
    res.json({ verified: true });
  });
  return { isVerified, enqueue };
}
