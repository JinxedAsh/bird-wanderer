import { Router } from 'express';
import { randomUUID } from 'node:crypto';

export function messagesRouter(
  db,
  discovery,
  { observation, canRead },
  now = Date.now,
) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,person_low TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      person_high TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,
      UNIQUE(person_low,person_high),CHECK(person_low<person_high)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,client_id TEXT NOT NULL,
      text TEXT NOT NULL,attachment_kind TEXT,observation_id TEXT REFERENCES observations(id) ON DELETE SET NULL,
      hotspot_id TEXT,hotspot_name TEXT,created_at INTEGER NOT NULL,UNIQUE(sender_id,client_id)
    );
    CREATE INDEX IF NOT EXISTS messages_conversation_date ON messages(conversation_id,created_at);
    CREATE TABLE IF NOT EXISTS message_reads (
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,read_through INTEGER NOT NULL,
      PRIMARY KEY(conversation_id,user_id)
    );
    CREATE TABLE IF NOT EXISTS message_limits (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,started_at INTEGER NOT NULL,attempts INTEGER NOT NULL
    );
  `);
  const failure = (status, message) =>
    Object.assign(new Error(message), { status });
  const member = (id, user) =>
    db
      .prepare(
        'SELECT * FROM conversations WHERE id=? AND (person_low=? OR person_high=?)',
      )
      .get(id, user, user);
  const other = (thread, user) =>
    thread.person_low === user ? thread.person_high : thread.person_low;
  const canContact = (id, user) => {
    const person = db.prepare('SELECT id FROM users WHERE id=?').get(id);
    if (!person || id === user) return false;
    const prefs = db
      .prepare('SELECT visibility FROM profiles WHERE user_id=?')
      .get(id);
    return (
      prefs?.visibility !== 'followers' ||
      !!db
        .prepare('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?')
        .get(user, id)
    );
  };
  const summary = (thread, user) => {
    const contact = db
      .prepare('SELECT id,name FROM users WHERE id=?')
      .get(other(thread, user));
    const latest = db
      .prepare(
        'SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1',
      )
      .get(thread.id);
    const read =
      db
        .prepare(
          'SELECT read_through FROM message_reads WHERE conversation_id=? AND user_id=?',
        )
        .get(thread.id, user)?.read_through || 0;
    const gear = !!db
      .prepare(
        "SELECT 1 FROM messages WHERE conversation_id=? AND (instr(lower(text),'gear')>0 OR instr(lower(text),'lens')>0 OR instr(lower(text),'camera')>0) LIMIT 1",
      )
      .get(thread.id);
    const place =
      db
        .prepare(
          'SELECT hotspot_name FROM messages WHERE conversation_id=? AND hotspot_name IS NOT NULL ORDER BY created_at DESC LIMIT 1',
        )
        .get(thread.id)?.hotspot_name || '';
    const okhla = !!db
      .prepare(
        "SELECT 1 FROM messages WHERE conversation_id=? AND (instr(lower(text),'okhla')>0 OR instr(lower(COALESCE(hotspot_name,'')),'okhla')>0) LIMIT 1",
      )
      .get(thread.id);
    return {
      id: thread.id,
      tags: [...(gear ? ['gear'] : []), ...(okhla ? ['okhla'] : [])],
      contactId: contact.id,
      contactName: contact.name,
      contactAvatar: '/bird-wanderer-logo.svg',
      status: 'Presence unavailable · refreshes every 5 seconds',
      lastMessage:
        latest?.text ||
        (latest?.attachment_kind === 'observation'
          ? 'Shared observation'
          : latest?.attachment_kind === 'hotspot'
            ? 'Shared hotspot'
            : 'No messages yet'),
      timeAgo: latest
        ? new Date(latest.created_at).toLocaleString('en-GB', {
            timeZone: 'Asia/Kolkata',
          })
        : '',
      updatedAt: latest?.created_at || thread.created_at,
      topic: place || (gear ? 'Gear discussion' : ''),
      contextLocation: place || 'No location attached',
      contextLifeNumber: '',
      messages: [],
      unread: !!db
        .prepare(
          'SELECT 1 FROM messages WHERE conversation_id=? AND sender_id!=? AND created_at>? LIMIT 1',
        )
        .get(thread.id, user, read),
    };
  };
  const serialize = (row, user) => {
    const sender = db
      .prepare('SELECT name FROM users WHERE id=?')
      .get(row.sender_id);
    let attachment;
    if (row.attachment_kind === 'observation') {
      const sighting = row.observation_id && observation(row.observation_id),
        visible = canRead(sighting, user);
      attachment = visible
        ? {
            kind: 'observation',
            id: sighting.id,
            label: sighting.species_name,
            imageUrl: `/api/observations/media/${sighting.media_id}`,
          }
        : {
            kind: 'observation',
            unavailable: true,
            label: 'Shared observation no longer available',
          };
    } else if (row.attachment_kind === 'hotspot')
      attachment = {
        kind: 'hotspot',
        id: row.hotspot_id,
        label: row.hotspot_name,
      };
    return {
      id: row.id,
      sender: row.sender_id === user ? 'me' : 'other',
      senderName: row.sender_id === user ? 'You' : sender.name,
      text: row.text,
      time: new Date(row.created_at).toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
      }),
      createdAt: row.created_at,
      delivered: true,
      attachment,
    };
  };
  const router = Router();
  const route = (fn) => (req, res, next) =>
    Promise.resolve()
      .then(() => fn(req, res))
      .catch((error) =>
        error.status
          ? res.status(error.status).json({ error: error.message })
          : next(error),
      );
  router.use((req, res, next) => {
    if (['GET', 'HEAD'].includes(req.method)) return next();
    const time = now(),
      row = db
        .prepare('SELECT * FROM message_limits WHERE user_id=?')
        .get(req.userId);
    if (row && time - row.started_at < 60000 && row.attempts >= 60)
      return res
        .status(429)
        .set('Retry-After', '60')
        .json({ error: 'Too many chat changes. Try again in a minute.' });
    db.prepare(
      `INSERT INTO message_limits VALUES (?,?,1) ON CONFLICT(user_id) DO UPDATE SET attempts=CASE WHEN ?-started_at>=60000 THEN 1 ELSE attempts+1 END,started_at=CASE WHEN ?-started_at>=60000 THEN ? ELSE started_at END`,
    ).run(req.userId, time, time, time, time);
    next();
  });
  router.get(
    '/',
    route((req, res) => {
      const offset = Number(req.query.offset || 0);
      if (!Number.isInteger(offset) || offset < 0 || offset > 10000)
        throw failure(400, 'Invalid conversation page.');
      const q =
        typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
      if (q.length > 100)
        throw failure(400, 'Search must be at most 100 characters.');
      const rows = db
        .prepare(
          `SELECT c.* FROM conversations c LEFT JOIN messages m ON m.conversation_id=c.id
      JOIN users u ON u.id=CASE WHEN c.person_low=? THEN c.person_high ELSE c.person_low END
      WHERE (person_low=? OR person_high=?) AND (instr(lower(u.name),?)>0 OR EXISTS(
        SELECT 1 FROM messages search WHERE search.conversation_id=c.id AND (instr(lower(search.text),?)>0 OR instr(lower(COALESCE(search.hotspot_name,'')),?)>0)))
      GROUP BY c.id ORDER BY COALESCE(MAX(m.created_at),c.created_at) DESC,c.id LIMIT 101 OFFSET ?`,
        )
        .all(req.userId, req.userId, req.userId, q, q, q, offset);
      res.json({
        conversations: rows
          .slice(0, 100)
          .map((row) => summary(row, req.userId)),
        nextOffset: rows.length > 100 ? offset + 100 : null,
      });
    }),
  );
  router.post(
    '/',
    route((req, res) => {
      const id = req.body?.personId;
      if (typeof id !== 'string' || !canContact(id, req.userId))
        throw failure(
          403,
          'This birder cannot currently receive a new message from your account.',
        );
      const [low, high] = [req.userId, id].sort();
      db.prepare('INSERT OR IGNORE INTO conversations VALUES (?,?,?,?)').run(
        randomUUID(),
        low,
        high,
        now(),
      );
      const thread = db
        .prepare(
          'SELECT * FROM conversations WHERE person_low=? AND person_high=?',
        )
        .get(low, high);
      res.json({ conversation: summary(thread, req.userId) });
    }),
  );
  router.get(
    '/:id',
    route((req, res) => {
      const thread = member(req.params.id, req.userId);
      if (!thread) throw failure(404, 'Conversation not found.');
      const before =
        req.query.before === undefined ? null : Number(req.query.before);
      if (before !== null && (!Number.isSafeInteger(before) || before < 0))
        throw failure(400, 'Invalid message page.');
      const rows = db
        .prepare(
          'SELECT * FROM messages WHERE conversation_id=? AND created_at<? ORDER BY created_at DESC LIMIT 201',
        )
        .all(thread.id, before ?? Number.MAX_SAFE_INTEGER);
      res.json({
        conversation: {
          ...summary(thread, req.userId),
          messages: rows
            .slice(0, 200)
            .reverse()
            .map((row) => serialize(row, req.userId)),
        },
        nextBefore: rows.length > 200 ? rows[199].created_at : null,
      });
    }),
  );
  router.get(
    '/:id/shareable',
    route((req, res) => {
      const thread = member(req.params.id, req.userId);
      if (!thread) throw failure(404, 'Conversation not found.');
      const rows = db
        .prepare(
          'SELECT id FROM observations WHERE user_id=? ORDER BY created_at DESC LIMIT 500',
        )
        .all(req.userId)
        .map((row) => observation(row.id))
        .filter((row) => canRead(row, other(thread, req.userId)));
      res.json({
        observations: rows.map((row) => ({
          id: row.id,
          label: row.species_name,
          imageUrl: `/api/observations/media/${row.media_id}`,
        })),
      });
    }),
  );
  router.post(
    '/:id/read',
    route((req, res) => {
      const thread = member(req.params.id, req.userId);
      if (!thread) throw failure(404, 'Conversation not found.');
      if (
        typeof req.body?.throughId !== 'string' ||
        req.body.throughId.length > 80
      )
        throw failure(400, 'Choose the last displayed message.');
      const message = db
        .prepare(
          'SELECT created_at FROM messages WHERE id=? AND conversation_id=?',
        )
        .get(req.body?.throughId || '', thread.id);
      if (!message) throw failure(400, 'Choose the last displayed message.');
      db.prepare(
        'INSERT INTO message_reads VALUES (?,?,?) ON CONFLICT(conversation_id,user_id) DO UPDATE SET read_through=MAX(read_through,excluded.read_through)',
      ).run(thread.id, req.userId, message.created_at);
      res.status(204).end();
    }),
  );
  router.post(
    '/:id/messages',
    route(async (req, res) => {
      const thread = member(req.params.id, req.userId);
      if (!thread) throw failure(404, 'Conversation not found.');
      if (!canContact(other(thread, req.userId), req.userId))
        throw failure(
          403,
          'This birder cannot currently receive new messages from your account.',
        );
      const body = req.body || {},
        text = typeof body.text === 'string' ? body.text.trim() : '';
      if (
        typeof body.clientId !== 'string' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
          body.clientId,
        ) ||
        text.length > 2000 ||
        typeof body.text !== 'string'
      )
        throw failure(
          400,
          'Write at most 2000 characters and a valid request ID.',
        );
      if (body.observationId && body.hotspotId)
        throw failure(400, 'Attach one observation or hotspot at a time.');
      if (!text && !body.observationId && !body.hotspotId)
        throw failure(400, 'Write a message or choose an attachment.');
      let kind = null,
        observationId = null,
        hotspotId = null,
        hotspotName = null;
      if (body.observationId) {
        const sighting =
          typeof body.observationId === 'string' &&
          observation(body.observationId);
        if (
          !sighting ||
          sighting.user_id !== req.userId ||
          !canRead(sighting, other(thread, req.userId))
        )
          throw failure(
            403,
            'Only your observations already visible to this recipient can be attached.',
          );
        kind = 'observation';
        observationId = sighting.id;
      } else if (body.hotspotId) {
        const catalogue = await discovery.catalogue(),
          hotspot = catalogue.hotspots.find((row) => row.id === body.hotspotId);
        if (!hotspot)
          throw failure(
            400,
            'Choose a public hotspot from the discovery catalogue.',
          );
        kind = 'hotspot';
        hotspotId = hotspot.id;
        hotspotName = hotspot.name;
      }
      // Catalogue lookup may await a provider; recheck contact permission before storing.
      if (!canContact(other(thread, req.userId), req.userId))
        throw failure(
          403,
          'This birder cannot currently receive new messages from your account.',
        );
      const previous = db
        .prepare('SELECT * FROM messages WHERE sender_id=? AND client_id=?')
        .get(req.userId, body.clientId);
      if (previous) {
        if (
          previous.conversation_id !== thread.id ||
          previous.text !== text ||
          previous.observation_id !== observationId ||
          previous.hotspot_id !== hotspotId
        )
          throw failure(
            409,
            'That request ID was already used for a different message.',
          );
        return res.json({ message: serialize(previous, req.userId) });
      }
      const latest = db
        .prepare(
          'SELECT MAX(created_at) AS time FROM messages WHERE conversation_id=?',
        )
        .get(thread.id).time;
      const id = randomUUID();
      db.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?,?,?,?,?)').run(
        id,
        thread.id,
        req.userId,
        body.clientId,
        text,
        kind,
        observationId,
        hotspotId,
        hotspotName,
        Math.max(now(), (latest || 0) + 1),
      );
      res.status(201).json({
        message: serialize(
          db.prepare('SELECT * FROM messages WHERE id=?').get(id),
          req.userId,
        ),
      });
    }),
  );
  return router;
}
