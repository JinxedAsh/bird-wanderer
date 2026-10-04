import { Router } from 'express';
import { DiscoveryError } from './discovery.mjs';

export function activityRouter(db, discovery, now = Date.now) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS discovery_saves (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('species', 'hotspot')),
      item_id TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, kind, item_id)
    );
    CREATE TABLE IF NOT EXISTS search_history (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      term_key TEXT NOT NULL, term TEXT NOT NULL, searched_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, term_key)
    );
  `);
  const router = Router();
  const state = (userId) => ({
    saves: db.prepare('SELECT kind, item_id AS id FROM discovery_saves WHERE user_id = ? ORDER BY created_at DESC, kind, item_id').all(userId),
    searches: db.prepare('SELECT term FROM search_history WHERE user_id = ? ORDER BY searched_at DESC, rowid DESC LIMIT 10').all(userId).map((row) => row.term),
  });
  const term = (value) => {
    if (typeof value !== 'string' || /[\x00-\x1f\x7f]/.test(value)) return null;
    const text = value.trim().replace(/\s+/g, ' ');
    return text.length && text.length <= 100 ? text : null;
  };
  router.get('/', (req, res) => res.json(state(req.userId)));
  router.put('/saves/:kind/:id', async (req, res, next) => {
    const { kind, id } = req.params;
    if (!['species', 'hotspot'].includes(kind) || !(kind === 'species' ? /^[a-z0-9]{3,16}$/ : /^L\d{1,20}$/).test(id) || typeof req.body?.saved !== 'boolean') {
      return res.status(400).json({ error: 'Enter a valid eBird item and save choice.' });
    }
    try {
      if (req.body.saved) {
        // Validate against the trusted provider catalogue, not browser-submitted records.
        const catalogue = await discovery.catalogue();
        const items = kind === 'species' ? catalogue.species : catalogue.hotspots;
        if (!items.some((item) => item.id === id && item.source === 'eBird')) return res.status(404).json({ error: 'Item not found in the current eBird catalogue.' });
        const exists = db.prepare('SELECT 1 FROM discovery_saves WHERE user_id = ? AND kind = ? AND item_id = ?').get(req.userId, kind, id);
        const count = db.prepare('SELECT COUNT(*) AS count FROM discovery_saves WHERE user_id = ?').get(req.userId).count;
        if (!exists && count >= 500) return res.status(409).json({ error: 'Your 500 saved-item limit is reached. Remove an item before saving another.' });
        db.prepare('INSERT OR IGNORE INTO discovery_saves VALUES (?, ?, ?, ?)').run(req.userId, kind, id, now());
      } else {
        // Removal must still work if the provider is unavailable or the region changes.
        db.prepare('DELETE FROM discovery_saves WHERE user_id = ? AND kind = ? AND item_id = ?').run(req.userId, kind, id);
      }
      res.json(state(req.userId));
    } catch (error) {
      if (error instanceof DiscoveryError) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  });
  router.post('/searches', (req, res) => {
    const text = term(req.body?.term);
    if (!text) return res.status(400).json({ error: 'Search must contain 1–100 characters without control characters.' });
    db.exec('BEGIN');
    try {
      const latest = db.prepare('SELECT MAX(searched_at) AS time FROM search_history WHERE user_id = ?').get(req.userId).time;
      const searchedAt = Math.max(now(), (latest ?? 0) + 1);
      db.prepare(`INSERT INTO search_history VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, term_key) DO UPDATE SET term = excluded.term, searched_at = excluded.searched_at`).run(req.userId, text.toLowerCase(), text, searchedAt);
      db.prepare(`DELETE FROM search_history WHERE user_id = ? AND term_key NOT IN (
        SELECT term_key FROM search_history WHERE user_id = ? ORDER BY searched_at DESC, rowid DESC LIMIT 10
      )`).run(req.userId, req.userId);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    res.json(state(req.userId));
  });
  router.delete('/searches', (req, res) => {
    if (req.body?.term === undefined) db.prepare('DELETE FROM search_history WHERE user_id = ?').run(req.userId);
    else {
      const text = term(req.body.term);
      if (!text) return res.status(400).json({ error: 'Invalid search term.' });
      db.prepare('DELETE FROM search_history WHERE user_id = ? AND term_key = ?').run(req.userId, text.toLowerCase());
    }
    res.json(state(req.userId));
  });
  return router;
}
