import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from './auth.mjs';

test('stored follows grant/revoke media access; social actions validate ownership, persist and cascade', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'bird-social-'));
  const options = {
    dbPath: join(directory, 'test.sqlite'),
    mediaPath: join(directory, 'media'),
    discovery: {
      catalogue: async () => ({
        species: [{ id: 'indrol2', name: 'Indian Roller', scientificName: 'Coracias benghalensis' }],
        hotspots: [{ id: 'L123', name: 'Test Wetland' }],
      }),
    },
  };
  let current = createApp(options),
    server = current.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const request = (path, cookie, method = 'GET', body, type = 'application/json') =>
    fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
      method,
      headers: {
        Origin: 'http://localhost:3000',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body !== undefined ? { 'Content-Type': type } : {}),
      },
      body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
    });
  const account = async (name) => {
    const r = await request('auth/register', null, 'POST', {
      name,
      email: `${name}@example.test`,
      password: 'test-password-12345',
    });
    return { cookie: r.headers.get('set-cookie').split(';')[0], user: (await r.json()).user };
  };
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    current.db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const a = await account('Author'),
    b = await account('Reader'),
    c = await account('Stranger');
  const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'green' } })
    .jpeg()
    .toBuffer();
  const media = (await (await request('observations/media', a.cookie, 'POST', jpeg, 'image/jpeg')).json())
    .media;
  const record = (
    await (
      await request('observations', a.cookie, 'POST', {
        mediaId: media.id,
        speciesId: 'indrol2',
        hotspotId: 'L123',
        observedAt: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
        notes: 'A fixture sighting',
        visibility: 'followers',
        hideExactLocation: true,
      })
    ).json()
  ).observation;
  const social = 'observations/social';
  assert.equal(
    (await request(`${social}/posts/${record.id}/like`, b.cookie, 'PUT', { liked: true })).status,
    404,
  );
  assert.equal(
    (await request(`${social}/follows/${b.user.id}`, b.cookie, 'PUT', { following: true })).status,
    400,
  );
  assert.equal(
    (await request(`${social}/follows/${a.user.id}`, b.cookie, 'PUT', { following: true })).status,
    200,
  );
  assert.equal((await request(`observations/media/${media.id}`, b.cookie)).status, 200);
  assert.equal((await request(`observations/media/${media.id}`, c.cookie)).status, 404);
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await request(`${social}/posts/${record.id}/like`, b.cookie, 'PUT', { liked: true })).status,
      200,
    );
  await request(`${social}/posts/${record.id}/save`, b.cookie, 'PUT', { saved: true });
  const comment = await request(`${social}/posts/${record.id}/comments`, b.cookie, 'POST', {
    text: 'Field tip <script>literal text</script>',
  });
  assert.equal(comment.status, 201);
  const commentId = (await comment.json()).comments[0].id;
  assert.equal((await request(`${social}/comments/${commentId}`, c.cookie, 'DELETE')).status, 404);
  assert.equal(
    (await request(`${social}/posts/${record.id}/comments`, b.cookie, 'POST', { text: '' })).status,
    400,
  );
  assert.equal(
    (await request(`${social}/posts/${record.id}/reports`, b.cookie, 'POST', { reason: 'unknown' })).status,
    400,
  );
  assert.equal(
    (
      await request(`${social}/posts/${record.id}/reports`, b.cookie, 'POST', {
        reason: 'identification',
        detail: 'Needs review',
      })
    ).status,
    201,
  );
  assert.equal(current.db.prepare('SELECT COUNT(*) AS count FROM reports').get().count, 1);
  await new Promise((resolve) => server.close(resolve));
  current.db.close();
  current = createApp(options);
  server = current.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  let shared = (await (await request(`observations/${record.id}`, b.cookie)).json()).observation;
  assert.equal(shared.likes, 1);
  assert.equal(shared.isLiked, true);
  assert.equal(shared.isSaved, true);
  assert.equal(shared.commentsCount, 1);
  assert.equal(shared.isFollowing, true);
  assert.equal((await request(`${social}/comments/${commentId}`, a.cookie, 'DELETE')).status, 204);
  // More than 100 earlier comments must not hide the newly acknowledged reply.
  const bulkInsert=current.db.prepare('INSERT INTO comments VALUES (?,?,?,?,?)');
  for(let i=0;i<101;i++)bulkInsert.run(`fixture-comment-${i}`,record.id,b.user.id,`Earlier ${i}`,Date.now()-10000+i);
  const latest=await request(`${social}/posts/${record.id}/comments`,b.cookie,'POST',{text:'Latest after 100'});
  assert.equal(latest.status,201);
  const conversation=await latest.json();assert.equal(conversation.commentsCount,102);assert.equal(conversation.comments.length,100);assert.equal(conversation.comments.at(-1).text,'Latest after 100');assert.ok(!conversation.comments.some(row=>row.id==='fixture-comment-0'));
  await request('observations/profile', a.cookie, 'PATCH', { locationPrivacy: 'private' });
  assert.equal(
    (await request(`${social}/posts/${record.id}/like`, b.cookie, 'PUT', { liked: false })).status,
    404,
  );
  assert.equal((await request(`${social}/people/${a.user.id}`, b.cookie)).status, 200);
  assert.equal(
    (await (await request(`${social}/people/${a.user.id}`, b.cookie)).json()).observations.length,
    0,
  );
  await request('observations/profile', a.cookie, 'PATCH', { locationPrivacy: 'approximate' });
  await request(`${social}/follows/${a.user.id}`, b.cookie, 'PUT', { following: false });
  assert.equal((await request(`observations/media/${media.id}`, b.cookie)).status, 404);
  // A burst cannot bypass the limit with idempotent writes, and reads remain usable.
  current.db.prepare('DELETE FROM community_limits WHERE user_id=?').run(b.user.id);
  for (let i = 0; i < 60; i++) {
    assert.equal(
      (await request(`${social}/follows/${a.user.id}`, b.cookie, 'PUT', { following: false })).status,
      200,
    );
  }
  const limited = await request(`${social}/follows/${a.user.id}`, b.cookie, 'PUT', { following: true });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.equal((await request(`${social}/people`, b.cookie)).status, 200);
  current.db.prepare('UPDATE community_limits SET started_at=0 WHERE user_id=?').run(b.user.id);
  assert.equal(
    (await request(`${social}/follows/${a.user.id}`, b.cookie, 'PUT', { following: false })).status,
    200,
  );
  await request(`observations/${record.id}`, a.cookie, 'DELETE');
  for (const table of ['post_likes', 'post_saves', 'comments', 'reports'])
    assert.equal(current.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count, 0);
});
