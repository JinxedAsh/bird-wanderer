import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from './auth.mjs';

async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'bird-messages-'));
  let time = Date.now();
  const options = {
    dbPath: join(dir, 'test.sqlite'),
    mediaPath: join(dir, 'media'),
    now: () => time,
    discovery: {
      catalogue: async () => ({
        species: [
          {
            id: 'bird1',
            name: 'Fixture Bird',
            scientificName: 'Fixture species',
          },
        ],
        hotspots: [{ id: 'L1', name: 'Fixture Okhla Park' }],
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
    db: () => current.db,
    advance: () => (time += 60001),
    restart: async () => {
      await stop();
      current = createApp(options);
      server = current.app.listen(0, '127.0.0.1');
      await new Promise((r) => server.once('listening', r));
    },
  };
}

test('chat persists participant-only messages, retry identity, search, read watermarks and pagination', async (t) => {
  const f = await fixture(t),
    a = await f.account('Sender'),
    b = await f.account('Recipient'),
    c = await f.account('Stranger');
  const chat = 'observations/chat';
  assert.equal((await f.request(chat)).status, 401);
  assert.equal(
    (await f.request(chat, a.cookie, 'POST', { personId: a.user.id })).status,
    403,
  );
  const open = async (from, to) =>
    (
      await (
        await f.request(chat, from.cookie, 'POST', { personId: to.user.id })
      ).json()
    ).conversation;
  const thread = await open(a, b);
  assert.equal((await open(b, a)).id, thread.id);
  const base = `${chat}/${thread.id}`;
  assert.equal((await f.request(base, c.cookie)).status, 404);
  assert.equal(
    (
      await f.request(`${base}/messages`, c.cookie, 'POST', {
        clientId: randomUUID(),
        text: 'intrusion',
      })
    ).status,
    404,
  );
  const body = {
    clientId: randomUUID(),
    text: 'Older camera gear message <script>literal</script>',
  };
  const sent = await f.request(`${base}/messages`, a.cookie, 'POST', body);
  assert.equal(sent.status, 201);
  const first = (await sent.json()).message;
  const duplicate = await f.request(`${base}/messages`, a.cookie, 'POST', body);
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).message.id, first.id);
  assert.equal(
    (
      await f.request(`${base}/messages`, a.cookie, 'POST', {
        ...body,
        text: 'changed',
      })
    ).status,
    409,
  );
  for (const invalid of [
    { text: '', clientId: randomUUID() },
    { text: 'x'.repeat(2001), clientId: randomUUID() },
    { text: 'bad', clientId: 42 },
    { text: [], clientId: randomUUID() },
  ])
    assert.equal(
      (await f.request(`${base}/messages`, a.cookie, 'POST', invalid)).status,
      400,
    );
  const second = (
    await (
      await f.request(`${base}/messages`, a.cookie, 'POST', {
        text: 'Latest message',
        clientId: randomUUID(),
      })
    ).json()
  ).message;
  let inbox = (
    await (await f.request(`${chat}?q=OLDER%20CAMERA`, b.cookie)).json()
  ).conversations;
  assert.equal(inbox.length, 1);
  assert.ok(inbox[0].tags.includes('gear'));
  assert.equal(inbox[0].unread, true);
  assert.equal(
    (await f.request(`${base}/read`, b.cookie, 'POST', { throughId: first.id }))
      .status,
    204,
  );
  assert.equal(
    (await (await f.request(chat, b.cookie)).json()).conversations[0].unread,
    true,
  );
  await f.request(`${base}/read`, b.cookie, 'POST', { throughId: second.id });
  await f.request(`${base}/read`, b.cookie, 'POST', { throughId: first.id });
  assert.equal(
    (await (await f.request(chat, b.cookie)).json()).conversations[0].unread,
    false,
  );
  const third = await open(a, c);
  assert.equal(
    (
      await f.request(`${chat}/${third.id}/read`, a.cookie, 'POST', {
        throughId: first.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (await (await f.request(chat, c.cookie)).json()).conversations.length,
    1,
  );
  assert.equal((await f.request(`${chat}?offset=-1`, a.cookie)).status, 400);
  assert.equal((await f.request(`${base}?before=abc`, a.cookie)).status, 400);
  // Insert older fixture messages directly to exercise the real bounded HTTP page boundary.
  const insert = f
    .db()
    .prepare('INSERT INTO messages VALUES (?,?,?,?,?,?,?,?,?,?)');
  for (let i = 0; i < 205; i++)
    insert.run(
      randomUUID(),
      thread.id,
      a.user.id,
      randomUUID(),
      `History ${i}`,
      null,
      null,
      null,
      null,
      first.createdAt - 1000 + i,
    );
  const page = await (await f.request(base, b.cookie)).json();
  assert.equal(page.conversation.messages.length, 200);
  assert.ok(page.nextBefore);
  const older = await (
    await f.request(`${base}?before=${page.nextBefore}`, b.cookie)
  ).json();
  assert.equal(older.conversation.messages.length, 7);
  assert.ok(
    older.conversation.messages.at(-1).createdAt <
      page.conversation.messages[0].createdAt,
  );
  await f.restart();
  const restored = await (await f.request(base, b.cookie)).json();
  assert.equal(restored.conversation.messages.at(-1).id, second.id);
  await f.request('observations/profile', b.cookie, 'PATCH', {
    profileVisibility: 'followers',
  });
  assert.equal(
    (
      await f.request(`${base}/messages`, a.cookie, 'POST', {
        text: 'blocked',
        clientId: randomUUID(),
      })
    ).status,
    403,
  );
  await f.request(`observations/social/follows/${b.user.id}`, a.cookie, 'PUT', {
    following: true,
  });
  assert.equal(
    (
      await f.request(`${base}/messages`, a.cookie, 'POST', {
        text: 'Allowed follower',
        clientId: randomUUID(),
      })
    ).status,
    201,
  );
  // Existing conversation history belongs to its participants even when new contact is restricted.
  assert.equal((await f.request(base, a.cookie)).status, 200);
  for (let i = 0; i < 65; i++)
    await f.request(`${base}/read`, b.cookie, 'POST', { throughId: second.id });
  assert.equal(
    (
      await f.request(`${base}/read`, b.cookie, 'POST', {
        throughId: second.id,
      })
    ).status,
    429,
  );
  f.advance();
  assert.equal(
    (
      await f.request(`${base}/read`, b.cookie, 'POST', {
        throughId: second.id,
      })
    ).status,
    204,
  );
});

test('chat attachments reuse current observation privacy, with public hotspot references and deletion tombstones', async (t) => {
  const f = await fixture(t),
    a = await f.account('Photographer'),
    b = await f.account('Viewer'),
    c = await f.account('Outsider');
  const thread = (
    await (
      await f.request('observations/chat', a.cookie, 'POST', {
        personId: b.user.id,
      })
    ).json()
  ).conversation;
  const base = `observations/chat/${thread.id}`;
  const jpeg = await sharp({
    create: { width: 8, height: 8, channels: 3, background: 'green' },
  })
    .jpeg()
    .toBuffer();
  const media = (
    await (
      await f.request(
        'observations/media',
        a.cookie,
        'POST',
        jpeg,
        'image/jpeg',
      )
    ).json()
  ).media;
  const response = await f.request('observations', a.cookie, 'POST', {
    mediaId: media.id,
    speciesId: 'bird1',
    hotspotId: 'L1',
    observedAt: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
    notes: 'Fixture',
    visibility: 'followers',
    hideExactLocation: true,
  });
  assert.equal(response.status, 201);
  const record = (await response.json()).observation;
  const send = (body) =>
    f.request(`${base}/messages`, a.cookie, 'POST', {
      text: '',
      clientId: randomUUID(),
      ...body,
    });
  assert.equal((await send({ observationId: record.id })).status, 403);
  assert.equal(
    (await (await f.request(`${base}/shareable`, a.cookie)).json()).observations
      .length,
    0,
  );
  await f.request(`observations/social/follows/${a.user.id}`, b.cookie, 'PUT', {
    following: true,
  });
  assert.equal(
    (await (await f.request(`${base}/shareable`, a.cookie)).json())
      .observations[0].id,
    record.id,
  );
  assert.equal((await send({ observationId: record.id })).status, 201);
  assert.equal((await send({ hotspotId: 'invented' })).status, 400);
  assert.equal(
    (await send({ hotspotId: 'L1', observationId: record.id })).status,
    400,
  );
  assert.equal((await send({ hotspotId: 'L1' })).status, 201);
  let messages = (await (await f.request(base, b.cookie)).json()).conversation
    .messages;
  assert.equal(messages[0].attachment.id, record.id);
  assert.equal(messages[1].attachment.label, 'Fixture Okhla Park');
  assert.equal(JSON.stringify(messages).includes('latitude'), false);
  assert.equal(JSON.stringify(messages).includes('longitude'), false);
  assert.equal((await f.request(`${base}/shareable`, c.cookie)).status, 404);
  await f.request(`observations/social/follows/${a.user.id}`, b.cookie, 'PUT', {
    following: false,
  });
  messages = (await (await f.request(base, b.cookie)).json()).conversation
    .messages;
  assert.equal(messages[0].attachment.unavailable, true);
  assert.equal(messages[0].attachment.id, undefined);
  assert.equal(messages[0].attachment.imageUrl, undefined);
  assert.equal(
    (await f.request(`observations/media/${media.id}`, b.cookie)).status,
    404,
  );
  await f.request(`observations/${record.id}`, a.cookie, 'DELETE');
  assert.equal(
    (await (await f.request(base, a.cookie)).json()).conversation.messages[0]
      .attachment.unavailable,
    true,
  );
});
