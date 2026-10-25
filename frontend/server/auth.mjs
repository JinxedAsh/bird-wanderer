import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { discoveryRouter, createDiscoveryService } from './discovery.mjs';
import { activityRouter } from './activity.mjs';
import { observationsRouter } from './observations.mjs';
import { retentionRouter } from './retention.mjs';
import { registerRecovery } from './recovery.mjs';

const scrypt = promisify(scryptCallback);
const cookieName = 'bw_session';
const sessionDuration = 7 * 24 * 60 * 60 * 1000;
const digest = (value) => createHash('sha256').update(value).digest('hex');
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email });
const passwordOptions = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

export function createApp({ dbPath = ':memory:', origin = 'http://localhost:3000', additionalOrigins = [], secureCookies = false, trustProxyLoopback = false, now = Date.now, rateLimit = 30, discovery = createDiscoveryService(), mediaPath, imageProcessor, push, recoveryMail } = {}) {
  const allowedOrigins = new Set([origin, ...additionalOrigins]);
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS auth_limits (
      key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, resets_at INTEGER NOT NULL
    );
  `);
  const app = express();
  if(trustProxyLoopback)app.set('trust proxy','loopback');
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !allowedOrigins.has(req.get('origin'))) {
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    }
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  const tokenFrom = (req) => {
    const token = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  };
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' };
  const startSession = (req, res, userId) => {
    const old = tokenFrom(req);
    if (old) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(old));
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(token), userId, now() + sessionDuration);
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionDuration });
  };
  const limited = (req, res, next) => {
    const time = now();
    db.prepare('DELETE FROM auth_limits WHERE resets_at <= ?').run(time);
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const keys = [`ip:${req.ip}`, req.userId ? `user:${req.userId}` : `email:${digest(email)}`];
    for (const key of keys) {
      const limit = db.prepare('SELECT * FROM auth_limits WHERE key = ?').get(key);
      if (limit && limit.attempts >= rateLimit) {
        res.set('Retry-After', String(Math.ceil((limit.resets_at - time) / 1000)));
        return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
      }
    }
    for (const key of keys) db.prepare(`INSERT INTO auth_limits VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1`).run(key, time + 15 * 60 * 1000);
    next();
  };
  const credentials = (body) => {
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') return null;
    const email = body.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.password.length > 128 || !body.password.length) return null;
    return { email, password: body.password };
  };
  const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/auth/me', (req, res) => {
    const token = tokenFrom(req);
    const user = token && db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE token_hash = ? AND expires_at > ?`).get(digest(token), now());
    if (!user) return res.status(401).json({ error: 'Please sign in.' });
    res.json({ user: publicUser(user) });
  });
  app.post('/api/auth/register', limited, asyncRoute(async (req, res) => {
    const input = credentials(req.body);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!input || input.password.length < 12 || name.length < 2 || name.length > 80) {
      return res.status(400).json({ error: 'Enter a name (2–80 characters), valid email and password (12–128 characters).' });
    }
    const salt = randomBytes(16).toString('hex');
    const hash = await scrypt(input.password, salt, 64, passwordOptions);
    const user = { id: randomUUID(), name, email: input.email };
    // The UNIQUE constraint also protects concurrent registrations.
    try {
      db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)').run(user.id, name, input.email, hash.toString('hex'), salt, now());
    } catch (error) {
      if (error.errcode === 2067) return res.status(409).json({ error: 'An account with that email already exists. Please sign in.' });
      throw error;
    }
    startSession(req, res, user.id);
    res.status(201).json({ user });
  }));
  app.post('/api/auth/login', limited, asyncRoute(async (req, res) => {
    const input = credentials(req.body);
    if (!input) return res.status(400).json({ error: 'Enter a valid email and password.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email);
    // Perform the same expensive operation even for unknown accounts.
    const hash = await scrypt(input.password, user?.salt || '00000000000000000000000000000000', 64, passwordOptions);
    if (!user || !timingSafeEqual(hash, Buffer.from(user.password_hash, 'hex')) ||
        db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id)?.password_hash !== user.password_hash) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    startSession(req, res, user.id);
    res.json({ user: publicUser(user) });
  }));
  app.post('/api/auth/logout', (req, res) => {
    const token = tokenFrom(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token));
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).end();
  });
  const requireSession = (req, res, next) => {
    const token = tokenFrom(req);
    const session = token && db.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?').get(digest(token), now());
    if (!session) return res.status(401).json({ error: 'Please sign in to discover birds and hotspots.' });
    req.userId = session.user_id;
    req.sessionHash = digest(token);
    next();
  };
  app.post('/api/auth/change-password', requireSession, limited, asyncRoute(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword.length || currentPassword.length > 128 ||
        typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128 || newPassword === currentPassword)
      return res.status(400).json({ error: 'Enter your current password and a different new password (12–128 characters).' });
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.userId);
    const currentHash = await scrypt(currentPassword, user.salt, 64, passwordOptions);
    if (!timingSafeEqual(currentHash, Buffer.from(user.password_hash, 'hex')))
      return res.status(403).json({ error: 'Your current password is incorrect.' });
    const salt = randomBytes(16).toString('hex');
    const hash = await scrypt(newPassword, salt, 64, passwordOptions);
    // Hashing yields to other requests. Recheck the session and original hash so
    // logout, expiry or a concurrent password change cannot be bypassed.
    if (!db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>?').get(req.sessionHash, req.userId, now()))
      return res.status(401).json({ error: 'Your session has ended. Please sign in again.' });
    if (db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.userId)?.password_hash !== user.password_hash)
      return res.status(409).json({ error: 'Your password changed in another request. Sign in again before retrying.' });
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=?').run(hash.toString('hex'), salt, req.userId);
      // Cascades revoke session-bound push registrations and queued deliveries.
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.userId);
      db.prepare('DELETE FROM password_resets WHERE user_id=?').run(req.userId);
      startSession(req, res, req.userId);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    res.json({ user: publicUser(user) });
  }));
  registerRecovery(app, db, { now, origin, allowedOrigins, mail: recoveryMail, rateLimit,
    hashPassword: async (password) => {
      const salt = randomBytes(16).toString('hex');
      return { salt, hash: (await scrypt(password, salt, 64, passwordOptions)).toString('hex') };
    },
  });
  app.use('/api/activity', requireSession, activityRouter(db, discovery, now));
  const observations = observationsRouter(db, discovery, { mediaPath, now, processImage: imageProcessor, push });
  app.use('/api/observations', requireSession, observations);
  app.use('/api/retention', requireSession, retentionRouter(db,discovery,now));
  app.use('/api/discovery', requireSession, discoveryRouter(discovery));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON request.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
    if(error.status===400&&['Z_DATA_ERROR','Z_BUF_ERROR'].includes(error.code))
      return res.status(400).json({error:'Invalid compressed request body.'});
    // Do not log request bodies, passwords, or session cookies.
    console.error('API error:', error.code || error.name);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return { app, db, dispatchPush:observations.dispatchPush,checkOpportunities:observations.checkOpportunities };
}
