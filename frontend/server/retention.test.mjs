import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from './auth.mjs';

const names = [
  'Coracias benghalensis',
  'Alcedo atthis',
  'Egretta garzetta',
  'Psittacula krameri',
  'Halcyon smyrnensis',
  'Passer domesticus',
  'Acridotheres tristis',
  'Pavo cristatus',
  'Pycnonotus cafer',
  'Dicrurus macrocercus',
  'Eudynamys scolopaceus',
  'Ardeola grayii',
];
async function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'bird-retention-'));
  let time = Date.UTC(2026, 9, 24, 8),
    available = true,
    inFlight = 0,
    peak = 0,
    photoCalls = 0;
  const discovery = {
    catalogue: async () => ({
      species: names.map((scientificName, index) => ({
        id: `bird${index}`,
        name: `Fixture Bird ${index}`,
        scientificName,
      })),
      hotspots: [
        { id: 'L1', name: 'Fixture Park' },
        { id: 'L2', name: 'Fixture Lake' },
      ],
    }),
    speciesPhoto: async (id) => {
      photoCalls++;
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight--;
      if (!available || id === 'bird0') throw new Error('Synthetic photo unavailable');
      return {
        photo: {
          scientificName: names[Number(id.slice(4))],
          author: 'Synthetic credited author',
          license: 'CC BY4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
          sourceUrl: `https://commons.wikimedia.org/wiki/File:fixture-${id}.jpg`,
          thumbnailUrl: `https://example.test/${id}.jpg`,
          title: `Synthetic ${id}`,
          credit: 'Fixture only',
          attribution: 'Fixture attribution',
          usageTerms: 'Fixture terms',
          restrictions: '',
          matchUrl: 'https://www.wikidata.org/wiki/Q1',
        },
      };
    },
  };
  const options = {
    dbPath: join(directory, 'test.sqlite'),
    mediaPath: join(directory, 'media'),
    discovery,
    now: () => time,
  };
  let current = createApp(options),
    server = current.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    current.db.close();
    rmSync(directory, { recursive: true, force: true });
  });
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
    return r.headers.get('set-cookie').split(';')[0];
  };
  return {
    request,
    account,
    get db() {
      return current.db;
    },
    get time() {
      return time;
    },
    advance: (days) => {
      time += days * 86400000;
    },
    available: (value) => {
      available = value;
    },
    get peak() {
      return peak;
    },
    get photoCalls() {
      return photoCalls;
    },
    restart: async () => {
      await new Promise((resolve) => server.close(resolve));
      current.db.close();
      current = createApp(options);
      server = current.app.listen(0, '127.0.0.1');
      await new Promise((resolve) => server.once('listening', resolve));
    },
  };
}

test('ten-question practice grades on server, resumes across restart, deduplicates answers/next and records honest streak/XP', async (t) => {
  const f = await fixture(t),
    a = await f.account('Learner'),
    b = await f.account('Other');
  const get = async () => await (await f.request('retention', a)).json();
  assert.equal((await f.request('retention', null)).status, 401);
  assert.deepEqual(
    (await get()).stats.challenges.map((c) => c.progress),
    [0, 0, 0],
  );
  assert.equal((await get()).stats.xp, 0);
  let response = await f.request('retention/quiz', a, 'POST', {});
  assert.equal(response.status, 201);
  let state = await response.json(),
    id = state.session.id;
  assert.equal(state.session.totalQuestions, 10);
  assert.equal(state.session.question.questionNumber, 1);
  assert.equal(state.session.feedback, null);
  assert.equal(state.session.question.correctOptionId, undefined);
  assert.equal(state.session.question.photoCredit.author, 'Synthetic credited author');
  assert.equal(f.peak, 3);
  assert.equal((await f.request(`retention/quiz/${id}/next`, a, 'POST', { index: 0 })).status, 409);
  assert.equal((await f.request(`retention/quiz/${id}/next`, a, 'POST', { index: -1 })).status, 400);
  let questions = JSON.parse(
    f.db.prepare('SELECT questions FROM quiz_sessions WHERE id=?').get(id).questions,
  );
  const correct = questions[0].correctOptionId;
  assert.equal(
    (await f.request(`retention/quiz/${id}/answer`, b, 'POST', { index: 0, optionId: correct })).status,
    404,
  );
  assert.equal(
    (await f.request(`retention/quiz/${id}/answer`, a, 'POST', { index: 0, optionId: 'wrong' })).status,
    400,
  );
  for (let retry = 0; retry < 2; retry++)
    state = await (
      await f.request(`retention/quiz/${id}/answer`, a, 'POST', { index: 0, optionId: correct })
    ).json();
  assert.equal(state.stats.xp, 50);
  assert.equal(state.session.feedback.correct, true);
  const wrong = questions[0].options.find((o) => o.id !== correct).id;
  assert.equal(
    (await f.request(`retention/quiz/${id}/answer`, a, 'POST', { index: 0, optionId: wrong })).status,
    409,
  );
  await f.restart();
  state = await get();
  assert.equal(state.session.feedback.selectedOptionId, correct);
  assert.equal(state.stats.xp, 50);
  await f.request(`retention/quiz/${id}/next`, a, 'POST', { index: 0 });
  assert.equal(
    (await (await f.request(`retention/quiz/${id}/next`, a, 'POST', { index: 0 })).json()).session
      .currentIndex,
    1,
  );
  for (let index = 1; index < 10; index++) {
    const optionId =
      index % 2
        ? questions[index].options.find((o) => o.id !== questions[index].correctOptionId).id
        : questions[index].correctOptionId;
    await f.request(`retention/quiz/${id}/answer`, a, 'POST', { index, optionId });
    state = await (await f.request(`retention/quiz/${id}/next`, a, 'POST', { index })).json();
  }
  assert.equal(state.session.status, 'completed');
  assert.equal(state.session.question, null);
  assert.equal(state.session.score, 5);
  assert.equal(state.stats.xp, 250);
  assert.equal(state.stats.streak, 1);
  assert.equal(
    (await f.request(`retention/quiz/${id}/next`, a, 'POST', { index: 9 })).status,
    200,
    'lost final response retry is safe',
  );
  assert.equal((await (await f.request('retention', b)).json()).stats.xp, 0);
  const oldCalls = f.photoCalls;
  f.advance(1);
  state = await (await f.request('retention/quiz', a, 'POST', {})).json();
  id = state.session.id;
  questions = JSON.parse(f.db.prepare('SELECT questions FROM quiz_sessions WHERE id=?').get(id).questions);
  for (let index = 0; index < 10; index++) {
    await f.request(`retention/quiz/${id}/answer`, a, 'POST', {
      index,
      optionId: questions[index].correctOptionId,
    });
    state = await (await f.request(`retention/quiz/${id}/next`, a, 'POST', { index })).json();
  }
  assert.equal(state.stats.streak, 2);
  assert.equal(state.stats.completedSessions, 2);
  assert.equal(state.stats.xp, 750);
  assert.ok(f.photoCalls > oldCalls);
  f.advance(2);
  assert.equal((await get()).stats.streak, 0, 'missed day breaks streak');
});

test('missing photo bank retries safely, explicit restart preserves earned XP, and challenge progress follows owned records', async (t) => {
  const f = await fixture(t),
    a = await f.account('Planner');
  f.available(false);
  assert.equal((await f.request('retention/quiz', a, 'POST', {})).status, 503);
  assert.equal((await (await f.request('retention', a)).json()).session, null);
  f.available(true);
  let state = await (await f.request('retention/quiz', a, 'POST', {})).json();
  const id = state.session.id;
  const answer = JSON.parse(
    f.db.prepare('SELECT questions FROM quiz_sessions WHERE id=?').get(id).questions,
  )[0].correctOptionId;
  await f.request(`retention/quiz/${id}/answer`, a, 'POST', { index: 0, optionId: answer });
  const calls = f.photoCalls;
  state = await (await f.request('retention/quiz', a, 'POST', { restart: true })).json();
  assert.notEqual(state.session.id, id);
  assert.equal(state.stats.xp, 50);
  assert.equal(state.stats.streak, 0);
  assert.equal(f.photoCalls, calls, 'valid bank shared without refetch');
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'green' } })
    .jpeg()
    .withExif({ IFD2: { ISOSpeedRatings: '400', FNumber: '5/1' } })
    .toBuffer();
  const records = [];
  for (let index = 0; index < 3; index++) {
    const media = (await (await f.request('observations/media', a, 'POST', bytes, 'image/jpeg')).json())
      .media;
    assert.equal(media.exif.iso, 400);
    assert.equal(media.exif.aperture, 5);
    const row = await f.request('observations', a, 'POST', {
      mediaId: media.id,
      speciesId: `bird${index}`,
      hotspotId: index % 2 ? 'L2' : 'L1',
      observedAt: new Date(f.time - 3600000).toISOString().slice(0, 16),
      notes: 'Synthetic challenge record',
      visibility: 'private',
      hideExactLocation: true,
    });
    assert.equal(row.status, 201);
    records.push((await row.json()).observation.id);
  }
  state = await (await f.request('retention', a)).json();
  assert.deepEqual(
    state.stats.challenges.map((c) => c.progress),
    [3, 2, 3],
  );
  await f.request(`observations/${records[1]}`, a, 'DELETE');
  state = await (await f.request('retention', a)).json();
  assert.deepEqual(
    state.stats.challenges.map((c) => c.progress),
    [2, 1, 2],
  );
  f.advance(8);
  const login = await f.request('auth/login', null, 'POST', {
    email: 'Planner@example.test',
    password: 'test-password-12345',
  });
  const fresh = login.headers.get('set-cookie').split(';')[0];
  assert.deepEqual(
    (await (await f.request('retention', fresh)).json()).stats.challenges.map((c) => c.progress),
    [0, 0, 0],
  );
});
