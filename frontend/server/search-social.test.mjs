import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from './auth.mjs';

async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'bird-search-social-'));
  const options = {
    dbPath: join(dir, 'test.sqlite'),
    mediaPath: join(dir, 'media'),
    discovery: {
      catalogue: async () => ({
        species: [
          {
            id: 'bird1',
            name: 'Fixture Bird',
            scientificName: 'Fixture species',
          },
        ],
        hotspots: [{ id: 'L1', name: 'Hidden Site Marker' }],
      }),
    },
  };
  let current = createApp(options),
    server = current.app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const request = (
    path,
    cookie,
    method = 'GET',
    body,
    type = 'application/json',
  ) =>
    fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
      method,
      headers: {
        Origin: 'http://localhost:3000',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body !== undefined ? { 'Content-Type': type } : {}),
      },
      body:
        body === undefined
          ? undefined
          : Buffer.isBuffer(body)
            ? body
            : JSON.stringify(body),
    });
  const account = async (name) => {
    const response = await request('auth/register', null, 'POST', {
      name,
      email: `${name}@example.test`,
      password: 'test-password-12345',
    });
    assert.equal(response.status, 201);
    return {
      cookie: response.headers.get('set-cookie').split(';')[0],
      user: (await response.json()).user,
    };
  };
  const post = async (owner, visibility = 'public') => {
    const jpeg = await sharp({
      create: { width: 8, height: 8, channels: 3, background: 'green' },
    })
      .jpeg()
      .toBuffer();
    const media = (
      await (
        await request(
          'observations/media',
          owner.cookie,
          'POST',
          jpeg,
          'image/jpeg',
        )
      ).json()
    ).media;
    const response = await request('observations', owner.cookie, 'POST', {
      mediaId: media.id,
      speciesId: 'bird1',
      hotspotId: 'L1',
      observedAt: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
      notes: 'OnlyOlderNeedle',
      visibility,
      hideExactLocation: true,
    });
    assert.equal(response.status, 201);
    return (await response.json()).observation;
  };
  const stop = async () => {
    await new Promise((r) => server.close(r));
    current.db.close();
  };
  t.after(async () => {
    await stop();
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    request,
    account,
    post,
    db: () => current.db,
    restart: async () => {
      await stop();
      current = createApp(options);
      server = current.app.listen(0, '127.0.0.1');
      await new Promise((r) => server.once('listening', r));
    },
  };
}

test('global search finds people without posts and older accessible records, with paging and no hidden-location inference', async (t) => {
  const f = await fixture(t),
    a = await f.account('Owner'),
    b = await f.account('Reader'),
    c = await f.account('NoPosts');
  const search = 'observations/social/search';
  let result = await (await f.request(`${search}?q=NoPosts`, b.cookie)).json();
  assert.equal(result.people[0].id, c.user.id);
  assert.equal(result.observations.length, 0);
  assert.equal(JSON.stringify(result).includes('@example.test'), false);
  const record = await f.post(a);
  const db = f.db(),
    media = db
      .prepare('SELECT * FROM media WHERE id=?')
      .get(
        db
          .prepare('SELECT media_id FROM observations WHERE id=?')
          .get(record.id).media_id,
      );
  // Synthetic DB rows exercise page boundaries; they are not real photographs or live observations.
  db.exec('BEGIN');
  for (let i = 0; i < 501; i++) {
    const mediaId = randomUUID();
    db.prepare('INSERT INTO media VALUES (?,?,?,?,?,?,?,?,?)').run(
      mediaId,
      a.user.id,
      `fixture-${mediaId}.jpg`,
      10,
      media.exif,
      null,
      null,
      0,
      media.created_at + i + 1,
    );
    db.prepare(
      'INSERT INTO observations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ).run(
      randomUUID(),
      a.user.id,
      mediaId,
      'bird1',
      'Fixture Bird',
      'Fixture species',
      'L1',
      'Hidden Site Marker',
      '2026-10-24T06:00',
      'Bulk fixture',
      'public',
      1,
      1,
      media.created_at + i + 1,
    );
  }
  for (let i = 0; i < 60; i++)
    db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(
      randomUUID(),
      `ZedFixture${String(i).padStart(2, '0')}`,
      `seed${i}@example.test`,
      'fixture-only',
      'fixture-only',
      Date.now(),
    );
  db.exec('COMMIT');
  result = await (
    await f.request(`${search}?q=onlyolderneedle`, b.cookie)
  ).json();
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].id, record.id);
  result = await (await f.request(`${search}?q=Fixture`, b.cookie)).json();
  assert.equal(result.observations.length, 50);
  assert.equal(result.nextPostsOffset, 50);
  const next = await (
    await f.request(`${search}?q=Fixture&postsOffset=50`, b.cookie)
  ).json();
  assert.equal(next.observations.length, 50);
  assert.ok(
    !next.observations.some((row) =>
      result.observations.some((old) => old.id === row.id),
    ),
  );
  result = await (await f.request(`${search}?q=ZedFixture`, b.cookie)).json();
  assert.equal(result.people.length, 50);
  assert.equal(result.nextPeopleOffset, 50);
  assert.equal(
    (
      await (
        await f.request(`${search}?q=ZedFixture&peopleOffset=50`, b.cookie)
      ).json()
    ).people.length,
    10,
  );
  const own = await (await f.request('observations', a.cookie)).json();
  assert.equal(own.observations.length, 500);
  assert.equal(own.nextOffset, 500);
  assert.equal(
    (await (await f.request('observations?offset=500', a.cookie)).json())
      .observations.length,
    2,
  );
  const person = (
    await (
      await f.request(`observations/social/people/${a.user.id}`, b.cookie)
    ).json()
  ).person;
  assert.equal(person.photosCount, 502);
  await f.request('observations/profile', a.cookie, 'PATCH', {
    locationPrivacy: 'hide',
  });
  result = await (
    await f.request(`${search}?q=Hidden%20Site%20Marker`, b.cookie)
  ).json();
  assert.equal(
    result.observations.length,
    0,
    'withheld hotspot cannot be inferred through search',
  );
  assert.equal(
    (
      await (
        await f.request(`${search}?q=Hidden%20Site%20Marker`, a.cookie)
      ).json()
    ).observations.length,
    50,
    'owner can search own hotspot',
  );
  await f.request('observations/profile', a.cookie, 'PATCH', {
    locationPrivacy: 'private',
  });
  assert.equal(
    (await (await f.request(`${search}?q=OnlyOlderNeedle`, b.cookie)).json())
      .observations.length,
    0,
  );
  assert.equal(
    (
      await (
        await f.request(`observations/social/people/${a.user.id}`, b.cookie)
      ).json()
    ).person.photosCount,
    0,
  );
  await f.request('observations/profile', a.cookie, 'PATCH', {
    locationPrivacy: 'approximate',
    profileVisibility: 'followers',
  });
  assert.equal(
    (await (await f.request(`${search}?q=OnlyOlderNeedle`, b.cookie)).json())
      .observations.length,
    0,
  );
  await f.request(`observations/social/follows/${a.user.id}`, b.cookie, 'PUT', {
    following: true,
  });
  assert.equal(
    (await (await f.request(`${search}?q=OnlyOlderNeedle`, b.cookie)).json())
      .observations[0].id,
    record.id,
  );
  await f.request(`observations/${record.id}`, a.cookie, 'PATCH', {
    visibility: 'private',
  });
  assert.equal(
    (await (await f.request(`${search}?q=OnlyOlderNeedle`, b.cookie)).json())
      .observations.length,
    0,
  );
  assert.equal(
    (await (await f.request(`${search}?q=OnlyOlderNeedle`, a.cookie)).json())
      .observations[0].id,
    record.id,
  );
  for (const suffix of [
    '?q=' + 'x'.repeat(101),
    '?q[]=x',
    '?peopleOffset=-1',
    '?postsOffset=bad',
  ])
    assert.equal((await f.request(search + suffix, b.cookie)).status, 400);
  assert.equal(
    (await f.request('observations?offset=-1', a.cookie)).status,
    400,
  );
  assert.equal((await f.request(search)).status, 401);
});

test('follow/comment/mention notifications deduplicate, persist, respect source privacy and delete with sources atomically', async (t) => {
  const f = await fixture(t),
    a = await f.account('Author'),
    b = await f.account('Commenter'),
    c = await f.account('Mentioned');
  const alerts = 'observations/alerts',
    social = 'observations/social';
  const inbox = async (user) =>
    (await (await f.request(alerts, user.cookie)).json()).notifications.filter(
      (n) => n.id.startsWith('social:'),
    );
  const follow = (following) =>
    f.request(`${social}/follows/${a.user.id}`, b.cookie, 'PUT', { following });
  await follow(true);
  await follow(true);
  let items = await inbox(a);
  assert.equal(items.length, 1);
  assert.equal(items[0].category, 'followers');
  assert.equal(items[0].personId, b.user.id);
  assert.equal(
    (await f.request(`${alerts}/${items[0].id}/read`, c.cookie, 'POST')).status,
    404,
  );
  await follow(false);
  assert.equal((await inbox(a)).length, 0);
  await follow(true);
  const record = await f.post(a);
  const cHandle = `birder-${c.user.id.replaceAll('-', '').slice(0, 12)}`;
  const comment = await f.request(
    `${social}/posts/${record.id}/comments`,
    b.cookie,
    'POST',
    { text: `A field tip for @${cHandle} and again @${cHandle}` },
  );
  assert.equal(comment.status, 201);
  const commentId = (await comment.json()).comments[0].id;
  assert.equal((await inbox(b)).length, 0, 'author of action is not notified');
  items = await inbox(c);
  assert.equal(items.length, 1);
  assert.match(items[0].title, /mentioned you/);
  assert.equal(items[0].observationId, record.id);
  assert.equal(items[0].category, 'mentions');
  assert.equal(items[0].isUnread, true);
  assert.equal(
    (await inbox(a)).filter((n) => n.observationId === record.id).length,
    1,
    'owner gets one comment notification',
  );
  await f.request(`${alerts}/${items[0].id}/read`, c.cookie, 'POST');
  await f.restart();
  assert.equal((await inbox(c))[0].isUnread, false);
  await f.request(`${alerts}/read`, a.cookie, 'POST');
  assert.equal(
    (await inbox(a)).some((n) => n.isUnread),
    false,
  );
  await f.request(`observations/${record.id}`, a.cookie, 'PATCH', {
    visibility: 'followers',
  });
  assert.equal(
    (await inbox(c)).length,
    0,
    'mention never grants observation access',
  );
  assert.equal(
    (await f.request(`${alerts}/${items[0].id}/read`, c.cookie, 'POST')).status,
    404,
  );
  await f.request(`${social}/posts/${record.id}/comments`, b.cookie, 'POST', {
    text: `Hidden mention @${cHandle}`,
  });
  assert.equal(
    f
      .db()
      .prepare(
        "SELECT COUNT(*) AS count FROM social_notifications WHERE user_id=? AND kind='mention'",
      )
      .get(c.user.id).count,
    1,
    'inaccessible recipient receives no new event',
  );
  await f.request(`${social}/comments/${commentId}`, b.cookie, 'DELETE');
  assert.equal(
    f
      .db()
      .prepare(
        'SELECT COUNT(*) AS count FROM social_notifications WHERE comment_id=?',
      )
      .get(commentId).count,
    0,
  );
  f.db().exec(
    "CREATE TRIGGER fail_social BEFORE INSERT ON social_notifications BEGIN SELECT RAISE(ABORT,'fixture'); END",
  );
  const before = f
    .db()
    .prepare('SELECT COUNT(*) AS count FROM comments')
    .get().count;
  assert.equal(
    (
      await f.request(
        `${social}/posts/${record.id}/comments`,
        b.cookie,
        'POST',
        { text: 'Rollback fixture' },
      )
    ).status,
    500,
  );
  assert.equal(
    f.db().prepare('SELECT COUNT(*) AS count FROM comments').get().count,
    before,
  );
  assert.equal(
    (
      await f.request(`${social}/follows/${c.user.id}`, b.cookie, 'PUT', {
        following: true,
      })
    ).status,
    500,
  );
  assert.equal(
    f
      .db()
      .prepare('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?')
      .get(b.user.id, c.user.id),
    undefined,
  );
  f.db().exec('DROP TRIGGER fail_social');
  await f.request(`observations/${record.id}`, a.cookie, 'DELETE');
  assert.equal(
    f
      .db()
      .prepare(
        'SELECT COUNT(*) AS count FROM social_notifications WHERE observation_id=?',
      )
      .get(record.id).count,
    0,
  );
});
