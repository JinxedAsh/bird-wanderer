import { Router } from 'express';
import { randomUUID } from 'node:crypto';

// SQL prefilter for bounded pages; canRead remains the final check before serialization.
// Aliases o/p and :viewer are shared by observation lists and global search.
export const visibleObservationSQL = `(o.user_id=:viewer OR (
  o.visibility!='private' AND COALESCE(p.location_privacy,'approximate')!='private'
  AND (o.visibility='public' OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=:viewer AND f.followed_id=o.user_id))
  AND (COALESCE(p.visibility,'public')='public' OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=:viewer AND f.followed_id=o.user_id))
))`;

export function communityStats(db, observationId, viewerId) {
  return {
    likes: db
      .prepare(
        'SELECT COUNT(*) AS count FROM post_likes WHERE observation_id=?',
      )
      .get(observationId).count,
    isLiked: !!db
      .prepare('SELECT 1 FROM post_likes WHERE observation_id=? AND user_id=?')
      .get(observationId, viewerId),
    isSaved: !!db
      .prepare('SELECT 1 FROM post_saves WHERE observation_id=? AND user_id=?')
      .get(observationId, viewerId),
    commentsCount: db
      .prepare('SELECT COUNT(*) AS count FROM comments WHERE observation_id=?')
      .get(observationId).count,
    comments: db
      .prepare(
        `SELECT c.id,c.user_id,c.text,c.created_at,u.name FROM comments c JOIN users u ON u.id=c.user_id
      WHERE observation_id=? ORDER BY c.created_at DESC,c.id DESC LIMIT 100`,
      )
      .all(observationId)
      .reverse()
      .map((row) => ({
        id: row.id,
        author: row.name,
        avatarInitials: row.name.slice(0, 2).toUpperCase(),
        time: new Date(row.created_at).toISOString(),
        text: row.text,
        color: 'bg-[#2d5a27] text-white',
        canDelete:
          row.user_id === viewerId ||
          !!db
            .prepare('SELECT 1 FROM observations WHERE id=? AND user_id=?')
            .get(observationId, viewerId),
      })),
  };
}

// Uses the observation module's single visibility policy for all interactions.
export function communityRouter(
  db,
  { observation, canRead, serialize },
  now = Date.now,
  notifications,
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_likes (
      observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(observation_id,user_id)
    );
    CREATE TABLE IF NOT EXISTS post_saves (
      observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(observation_id,user_id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY, observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL,created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reports (
      observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, reason TEXT NOT NULL,detail TEXT NOT NULL,
      created_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'open',PRIMARY KEY(observation_id,user_id)
    );
    CREATE TABLE IF NOT EXISTS community_limits (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, started_at INTEGER NOT NULL,attempts INTEGER NOT NULL
    );
  `);
  const router = Router();
  const error = (status, message) =>
    Object.assign(new Error(message), { status });
  const route = (fn) => (req, res, next) => {
    try {
      Promise.resolve(fn(req, res)).catch(next);
    } catch (failure) {
      next(failure);
    }
  };
  router.use((req, res, next) => {
    if (['GET', 'HEAD'].includes(req.method)) return next();
    const row = db
        .prepare('SELECT * FROM community_limits WHERE user_id=?')
        .get(req.userId),
      time = now();
    if (row && time - row.started_at < 60000 && row.attempts >= 60)
      return res
        .status(429)
        .set('Retry-After', '60')
        .json({ error: 'Too many community changes. Try again in a minute.' });
    db.prepare(
      `INSERT INTO community_limits VALUES (?,?,1) ON CONFLICT(user_id) DO UPDATE SET
      attempts=CASE WHEN ?-started_at>=60000 THEN 1 ELSE attempts+1 END,
      started_at=CASE WHEN ?-started_at>=60000 THEN ? ELSE started_at END`,
    ).run(req.userId, time, time, time, time);
    next();
  });
  const readable = (id, viewer) => {
    const row = observation(id);
    if (!canRead(row, viewer)) throw error(404, 'Sighting not found.');
    return row;
  };
  const person = (id, viewer) => {
    const user = db.prepare('SELECT id,name FROM users WHERE id=?').get(id);
    if (!user) throw error(404, 'Birder not found.');
    const prefs = db.prepare('SELECT * FROM profiles WHERE user_id=?').get(id);
    const following = !!db
      .prepare('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?')
      .get(viewer, id);
    const visible =
      viewer === id || !prefs || prefs.visibility === 'public' || following;
    const counts = db
      .prepare(
        `SELECT COUNT(*) AS photos,COUNT(DISTINCT o.species_id) AS birds FROM observations o LEFT JOIN profiles p ON p.user_id=o.user_id WHERE o.user_id=:owner AND ${visibleObservationSQL}`,
      )
      .get({ owner: id, viewer });
    return {
      id,
      name: user.name,
      handle: `birder-${id.replaceAll('-', '').slice(0, 12)}`,
      avatarUrl: '/bird-wanderer-logo.svg',
      bio: visible ? prefs?.bio || '' : '',
      primaryRig: visible ? prefs?.gear || '' : '',
      location:
        visible && (!prefs || prefs.location_privacy === 'approximate')
          ? prefs?.location || ''
          : '',
      following,
      isSelf: id === viewer,
      photosCount: counts.photos,
      birdsCount: counts.birds,
      followersCount: db
        .prepare('SELECT COUNT(*) AS count FROM follows WHERE followed_id=?')
        .get(id).count,
      visibility: prefs?.visibility || 'public',
    };
  };
  const pageOffset = (value) => {
    const result = Number(value ?? 0);
    if (!Number.isSafeInteger(result) || result < 0 || result > Number.MAX_SAFE_INTEGER-50)
      throw error(400, 'Invalid search page.');
    return result;
  };
  const queryText = (value) => {
    if (value !== undefined && typeof value !== 'string')
      throw error(400, 'Use a text search.');
    const result = (value || '').trim().toLowerCase();
    if (result.length > 100)
      throw error(400, 'Search must be at most 100 characters.');
    return result;
  };
  const peoplePage = (q, offset, viewer) => {
    const users = db
      .prepare(
        `SELECT id FROM users WHERE instr(lower(name),?)>0 OR instr('birder-'||substr(replace(id,'-',''),1,12),?)>0 ORDER BY name,id LIMIT 51 OFFSET ?`,
      )
      .all(q, q, offset);
    return {
      people: users.slice(0, 50).map((row) => person(row.id, viewer)),
      nextOffset: users.length > 50 ? offset + 50 : null,
    };
  };
  router.get(
    '/people',
    route((req, res) =>
      res.json(
        peoplePage(
          queryText(req.query.q),
          pageOffset(req.query.offset),
          req.userId,
        ),
      ),
    ),
  );
  router.get(
    '/search',
    route((req, res) => {
      const q = queryText(req.query.q),
        peopleOffset = pageOffset(req.query.peopleOffset),
        postsOffset = pageOffset(req.query.postsOffset);
      const people = peoplePage(q, peopleOffset, req.userId);
      const rows = db
        .prepare(
          `SELECT o.id FROM observations o JOIN users u ON u.id=o.user_id LEFT JOIN profiles p ON p.user_id=o.user_id
      WHERE ${visibleObservationSQL} AND (instr(lower(o.species_name),:q)>0 OR instr(lower(o.scientific_name),:q)>0 OR instr(lower(u.name),:q)>0 OR instr(lower(o.notes),:q)>0
      OR instr(lower(CASE WHEN o.user_id=:viewer OR (o.hotspot_id!='' AND COALESCE(p.location_privacy,'approximate')='approximate') THEN o.hotspot_name ELSE '' END),:q)>0)
      ORDER BY o.created_at DESC,o.id DESC LIMIT 51 OFFSET :offset`,
        )
        .all({ viewer: req.userId, q, offset: postsOffset });
      res.json({
        people: people.people,
        nextPeopleOffset: people.nextOffset,
        observations: rows
          .slice(0, 50)
          .map((row) => observation(row.id))
          .filter((row) => canRead(row, req.userId))
          .map((row) => serialize(row, req.userId)),
        nextPostsOffset: rows.length > 50 ? postsOffset + 50 : null,
      });
    }),
  );
  router.get(
    '/people/:id',
    route((req, res) => {
      const details = person(req.params.id, req.userId);
      const rows = db
        .prepare(
          'SELECT id FROM observations WHERE user_id=? ORDER BY created_at DESC LIMIT 100',
        )
        .all(req.params.id)
        .map((row) => observation(row.id))
        .filter((row) => canRead(row, req.userId));
      res.json({
        person: details,
        observations: rows.map((row) => serialize(row, req.userId)),
      });
    }),
  );
  router.put(
    '/follows/:id',
    route((req, res) => {
      if (typeof req.body?.following !== 'boolean')
        throw error(400, 'Choose whether to follow this birder.');
      if (req.params.id === req.userId)
        throw error(400, 'You cannot follow yourself.');
      person(req.params.id, req.userId);
      db.exec('BEGIN');
      try {
        if (req.body.following) {
          const result = db
            .prepare('INSERT OR IGNORE INTO follows VALUES (?,?)')
            .run(req.userId, req.params.id);
          if (result.changes)
            notifications?.queueFollow(req.userId, req.params.id, true);
        } else {
          db.prepare(
            'DELETE FROM follows WHERE follower_id=? AND followed_id=?',
          ).run(req.userId, req.params.id);
          notifications?.queueFollow(req.userId, req.params.id, false);
        }
        db.exec('COMMIT');
      } catch (failure) {
        db.exec('ROLLBACK');
        throw failure;
      }
      res.json({ person: person(req.params.id, req.userId) });
    }),
  );
  for (const [kind, table, field] of [
    ['like', 'post_likes', 'liked'],
    ['save', 'post_saves', 'saved'],
  ]) {
    router.put(
      `/posts/:id/${kind}`,
      route((req, res) => {
        readable(req.params.id, req.userId);
        if (typeof req.body?.[field] !== 'boolean')
          throw error(400, `Choose a valid ${kind} state.`);
        if (req.body[field])
          db.prepare(`INSERT OR IGNORE INTO ${table} VALUES (?,?)`).run(
            req.params.id,
            req.userId,
          );
        else
          db.prepare(
            `DELETE FROM ${table} WHERE observation_id=? AND user_id=?`,
          ).run(req.params.id, req.userId);
        res.json(communityStats(db, req.params.id, req.userId));
      }),
    );
  }
  router.post(
    '/posts/:id/comments',
    route((req, res) => {
      readable(req.params.id, req.userId);
      const text =
        typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      if (!text || text.length > 1000)
        throw error(400, 'Write a comment of 1–1000 characters.');
      const comment = {
        id: randomUUID(),
        observation_id: req.params.id,
        user_id: req.userId,
        text,
        created_at: now(),
      };
      db.exec('BEGIN');
      try {
        db.prepare('INSERT INTO comments VALUES (?,?,?,?,?)').run(
          comment.id,
          comment.observation_id,
          comment.user_id,
          comment.text,
          comment.created_at,
        );
        notifications?.queueComment(comment);
        db.exec('COMMIT');
      } catch (failure) {
        db.exec('ROLLBACK');
        throw failure;
      }
      res.status(201).json(communityStats(db, req.params.id, req.userId));
    }),
  );
  router.delete(
    '/comments/:id',
    route((req, res) => {
      const comment = db
        .prepare('SELECT * FROM comments WHERE id=?')
        .get(req.params.id);
      if (!comment) throw error(404, 'Comment not found.');
      const post = observation(comment.observation_id);
      if (comment.user_id !== req.userId && post?.user_id !== req.userId)
        throw error(404, 'Comment not found.');
      db.prepare('DELETE FROM comments WHERE id=?').run(comment.id);
      res.status(204).end();
    }),
  );
  router.post(
    '/posts/:id/reports',
    route((req, res) => {
      readable(req.params.id, req.userId);
      const { reason, detail = '' } = req.body || {};
      if (
        !['identification', 'location', 'privacy', 'abuse', 'other'].includes(
          reason,
        ) ||
        typeof detail !== 'string' ||
        detail.length > 1000
      )
        throw error(400, 'Choose a report reason and at most 1000 characters.');
      db.prepare(
        `INSERT INTO reports VALUES (?,?,?,?,?,'open') ON CONFLICT(observation_id,user_id) DO UPDATE SET
      reason=excluded.reason,detail=excluded.detail,created_at=excluded.created_at,status='open'`,
      ).run(req.params.id, req.userId, reason, detail.trim(), now());
      res.status(201).json({
        status: 'open',
        message:
          'Report stored for review. This is not confirmation that moderation has occurred.',
      });
    }),
  );
  // Convert known validation/access errors without exposing database internals.
  router.use((failure, _req, res, next) => {
    if (failure.status)
      return res.status(failure.status).json({ error: failure.message });
    next(failure);
  });
  return router;
}
