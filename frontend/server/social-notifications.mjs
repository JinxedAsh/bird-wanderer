import { randomUUID } from 'node:crypto';

// Store source references; read-time authorization prevents stale privacy snapshots.
export function createSocialNotifications(
  db,
  { observation, canRead },
  now = Date.now,
) {
  db.exec(`CREATE TABLE IF NOT EXISTS social_notifications (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('follow','comment','mention')),source_id TEXT NOT NULL,
    observation_id TEXT REFERENCES observations(id) ON DELETE CASCADE,
    comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,read_at INTEGER,UNIQUE(user_id,kind,source_id)
  );
  CREATE INDEX IF NOT EXISTS social_notifications_owner ON social_notifications(user_id,created_at);`);
  const insert = (user, actor, kind, source, post = null, comment = null) => {
    if (user === actor) return;
    db.prepare(
      'INSERT OR IGNORE INTO social_notifications VALUES (?,?,?,?,?,?,?,?,NULL)',
    ).run(randomUUID(), user, actor, kind, source, post, comment, now());
  };
  const queueFollow = (actor, user, following) => {
    if (following) insert(user, actor, 'follow', actor);
    else
      db.prepare(
        "DELETE FROM social_notifications WHERE user_id=? AND actor_id=? AND kind='follow'",
      ).run(user, actor);
  };
  const queueComment = (row) => {
    const post = observation(row.observation_id),
      recipients = new Set();
    // Handles are stable IDs, not display names; ambiguous prefixes do not notify anyone.
    for (const match of row.text.matchAll(
      /@birder-([a-f0-9]{12})(?![a-f0-9])/gi,
    )) {
      if (recipients.size >= 10) break;
      const users = db
        .prepare(
          "SELECT id FROM users WHERE substr(replace(id,'-',''),1,12)=? LIMIT 2",
        )
        .all(match[1].toLowerCase());
      if (users.length === 1 && canRead(post, users[0].id))
        recipients.add(users[0].id);
    }
    for (const user of recipients)
      insert(user, row.user_id, 'mention', row.id, post.id, row.id);
    if (!recipients.has(post.user_id))
      insert(post.user_id, row.user_id, 'comment', row.id, post.id, row.id);
  };
  const serialize = (row, user) => {
    if (!row || row.user_id !== user) return null;
    const actor = db
      .prepare('SELECT id,name FROM users WHERE id=?')
      .get(row.actor_id);
    if (!actor) return null;
    if (row.kind === 'follow') {
      if (
        !db
          .prepare(
            'SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?',
          )
          .get(actor.id, user)
      )
        return null;
    } else {
      if (!canRead(observation(row.observation_id), user)) return null;
      if (
        !db
          .prepare('SELECT 1 FROM comments WHERE id=? AND observation_id=?')
          .get(row.comment_id, row.observation_id)
      )
        return null;
    }
    return {
      id: `social:${row.id}`,
      personId: row.kind === 'follow' ? actor.id : undefined,
      observationId: row.observation_id || undefined,
      title:
        row.kind === 'follow'
          ? `${actor.name} started following you`
          : row.kind === 'mention'
            ? `${actor.name} mentioned you`
            : `${actor.name} added a field note`,
      description:
        row.kind === 'follow'
          ? 'Open this birder’s current profile.'
          : row.kind === 'mention'
            ? 'You were tagged in a visible observation’s comments.'
            : 'A comment was added to your observation. Open it to read the current discussion.',
      category: row.kind === 'follow' ? 'followers' : 'mentions',
      isUnread: row.read_at === null,
      createdAt: new Date(row.created_at).toISOString(),
      timeAgo: `${new Date(row.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })} IST`,
      icon: row.kind === 'follow' ? 'person_add' : 'chat_bubble',
      iconBg: 'bg-[#ebeef3]',
      iconColor: 'text-[#154212]',
    };
  };
  return {
    queueFollow,
    queueComment,
    serialize,
    list: (user) =>
      db
        .prepare(
          'SELECT * FROM social_notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 200',
        )
        .all(user)
        .map((row) => serialize(row, user))
        .filter(Boolean),
    read: (id, user) => {
      const row = db
        .prepare('SELECT * FROM social_notifications WHERE id=? AND user_id=?')
        .get(id, user);
      if (!serialize(row, user)) return false;
      db.prepare(
        'UPDATE social_notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?',
      ).run(now(), id, user);
      return true;
    },
    readAll: (user) =>
      db
        .prepare(
          'UPDATE social_notifications SET read_at=? WHERE user_id=? AND read_at IS NULL',
        )
        .run(now(), user),
  };
}
