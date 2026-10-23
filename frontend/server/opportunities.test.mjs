import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from './auth.mjs';
import { createPush } from './push.mjs';
import { forecastWindows, localClock } from './opportunities.mjs';

const time = Date.UTC(2026, 9, 24, 0, 0); //05:30 India, not the execution machine's local clock.
const forecast = () => ({
  source: 'Open-Meteo',
  timezone: 'Asia/Kolkata',
  fetchedAt: new Date(time).toISOString(),
  days: [{ date: '2026-10-24', sunrise: '2026-10-24T06:20', sunset: '2026-10-24T17:40' }],
  hourly: [
    { time: '2026-10-24T05:00', rainProbability: 0, windKmh: 0 },
    { time: '2026-10-24T07:00', rainProbability: 20, windKmh: 15 },
    { time: '2026-10-24T17:00', rainProbability: 0, windKmh: 0 },
  ],
});

test('opportunities use future local light windows and explicit bounded rain/wind, withholding stale/missing evidence', () => {
  assert.equal(localClock(time, 'Asia/Kolkata'), '2026-10-24T05:30');
  assert.equal(localClock(Date.UTC(2026, 10, 1, 6, 30), 'America/New_York'), '2026-11-01T01:30');
  assert.equal(forecastWindows(forecast(), time)[0].time, '2026-10-24T07:00');
  assert.equal(
    forecastWindows(
      { ...forecast(), hourly: [{ time: '2026-10-24T17:00', rainProbability: 0, windKmh: 0 }] },
      time,
    )[0].rainProbability,
    0,
  );
  for (const patch of [
    { timezone: 'unknown' },
    { source: 'other' },
    { fetchedAt: new Date(time - 21 * 60000).toISOString() },
    { fetchedAt: new Date(time + 120000).toISOString() },
    { days: [{ date: '2026-10-24', sunrise: null, sunset: null }] },
    { hourly: [{ time: '2026-10-24T07:00', rainProbability: null, windKmh: 0 }] },
    { hourly: [{ time: '2026-10-24T07:00', rainProbability: 21, windKmh: 0 }] },
    { hourly: [{ time: '2026-10-24T07:00', rainProbability: 0, windKmh: 16 }] },
    { hourly: [{ time: '2026-10-24T12:00', rainProbability: 0, windKmh: 0 }] },
  ])
    assert.deepEqual(forecastWindows({ ...forecast(), ...patch }, time), []);
});

test('forecast scheduler isolates failures, honors opt-in/subscriptions, deduplicates, preserves reads and guards push', async (t) => {
  let clock = time,
    weatherCalls = [],
    sent = [];
  const current = createApp({
    now: () => clock,
    discovery: {
      catalogue: async () => ({
        species: [],
        hotspots: [
          { id: 'L1', name: 'Unavailable Wetland' },
          { id: 'L2', name: 'Test Park' },
        ],
      }),
      hotspotWeather: async (id) => {
        weatherCalls.push(id);
        if (id === 'L1') throw new Error('Synthetic outage');
        return { ...forecast(), fetchedAt: new Date(clock).toISOString() };
      },
    },
    push: {
      webConfig: { projectId: 'fixture' },
      vapidKey: 'fixture',
      send: async (message) => {
        sent.push(message);
      },
    },
  });
  const server = current.app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    current.db.close();
  });
  const request = (path, cookie, method = 'GET', body) =>
    fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
      method,
      headers: {
        Origin: 'http://localhost:3000',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const account = async (name) => {
    const r = await request('auth/register', null, 'POST', {
      name,
      email: `${name}@example.test`,
      password: 'test-password-12345',
    });
    return { cookie: r.headers.get('set-cookie').split(';')[0], user: (await r.json()).user };
  };
  const a = await account('Planner'),
    b = await account('Other');
  const base = 'observations/alerts';
  for (const person of [a, b]) {
    await request('observations/profile', person.cookie, 'PATCH', { pushAlertsEnabled: true });
    for (const id of ['L1', 'L2'])
      await request(`${base}/subscriptions/hotspot/${id}`, person.cookie, 'PUT', { enabled: true });
  }
  await current.checkOpportunities();
  assert.equal(weatherCalls.length, 0, 'explicit opt-in required');
  assert.equal((await request(`${base}/opportunity`, a.cookie, 'PUT', { enabled: 'yes' })).status, 400);
  await request(`${base}/opportunity`, a.cookie, 'PUT', { enabled: true });
  await request(`${base}/push/device`, a.cookie, 'PUT', { token: 'forecast-fixture-device-token' });
  await Promise.all([current.checkOpportunities(), current.checkOpportunities()]);
  assert.deepEqual(weatherCalls, ['L1', 'L2'], 'one failed site does not stop independent site');
  let state = await (await request(base, a.cookie)).json();
  assert.equal(state.notifications.length, 1);
  assert.equal(state.opportunity.checks.find((c) => c.id === 'L1').status, 'unavailable');
  const alert = state.notifications[0];
  assert.match(alert.description, /General preparation rule/);
  assert.match(alert.description, /2026-10-24T00:00:00.000Z/);
  assert.equal(alert.hotspotId, 'L2');
  assert.equal(alert.opportunityId.length, 36);
  assert.equal((await (await request(base, b.cookie)).json()).notifications.length, 0);
  assert.equal((await request(`${base}/${encodeURIComponent(alert.id)}/read`, b.cookie, 'POST')).status, 404);
  await current.checkOpportunities();
  assert.equal(weatherCalls.length, 2, 'hourly check bound');
  assert.equal((await current.dispatchPush()).sent, 1);
  assert.equal(sent[0].data.kind, 'forecast');
  assert.doesNotMatch(JSON.stringify(sent), /Test Park|latitude|longitude|20%/);
  await request(`${base}/${encodeURIComponent(alert.id)}/read`, a.cookie, 'POST');
  state = await (await request(base, a.cookie)).json();
  assert.equal(state.notifications[0].isUnread, false);
  clock += 3600000;
  await current.checkOpportunities();
  assert.equal(
    (await (await request(base, a.cookie)).json()).notifications.length,
    1,
    'repeat same day cannot duplicate',
  );
  await request(`${base}/subscriptions/hotspot/L2`, a.cookie, 'PUT', { enabled: false });
  assert.equal((await (await request(base, a.cookie)).json()).notifications.length, 0);
  assert.equal((await request(`${base}/${encodeURIComponent(alert.id)}/read`, a.cookie, 'POST')).status, 404);
  await request(`${base}/subscriptions/hotspot/L2`, a.cookie, 'PUT', { enabled: true });
  clock = Date.UTC(2026, 9, 24, 2, 0); //07:30 local: an expired07:00 slot is hidden.
  assert.equal((await (await request(base, a.cookie)).json()).notifications.length, 0);
});

test('outbox schema migration preserves old sighting delivery attempts/status and both source foreign keys', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(
      `PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);CREATE TABLE sessions(token_hash TEXT PRIMARY KEY);CREATE TABLE sighting_alerts(id TEXT PRIMARY KEY,user_id TEXT);CREATE TABLE opportunity_alerts(id TEXT PRIMARY KEY,user_id TEXT);CREATE TABLE push_devices(token TEXT PRIMARY KEY,user_id TEXT,session_hash TEXT,created_at INTEGER);CREATE TABLE push_deliveries(alert_id TEXT NOT NULL REFERENCES sighting_alerts(id) ON DELETE CASCADE,device_token TEXT NOT NULL REFERENCES push_devices(token) ON DELETE CASCADE,status TEXT NOT NULL,attempts INTEGER NOT NULL,next_attempt_at INTEGER NOT NULL,last_code TEXT NOT NULL,PRIMARY KEY(alert_id,device_token));INSERT INTO users VALUES('u');INSERT INTO sessions VALUES('s');INSERT INTO sighting_alerts VALUES('a','u');INSERT INTO opportunity_alerts VALUES('o','u');INSERT INTO push_devices VALUES('d','u','s',1);INSERT INTO push_deliveries VALUES('a','d','pending',3,123,'provider-error');`,
    );
    createPush(db, { canRead: () => true, observation: () => null });
    const row = db.prepare('SELECT * FROM push_deliveries').get();
    assert.equal(row.attempts, 3);
    assert.equal(row.status, 'pending');
    assert.equal(row.next_attempt_at, 123);
    assert.equal(row.last_code, 'provider-error');
    assert.throws(() =>
      db
        .prepare(
          'INSERT INTO push_deliveries(alert_id,opportunity_id,device_token,next_attempt_at) VALUES (?,?,?,1)',
        )
        .run('a', 'o', 'd'),
    );
    db.prepare('INSERT INTO push_deliveries(opportunity_id,device_token,next_attempt_at) VALUES (?,?,1)').run(
      'o',
      'd',
    );
    db.prepare("DELETE FROM opportunity_alerts WHERE id='o'").run();
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM push_deliveries').get().n, 1);
    db.prepare("DELETE FROM sighting_alerts WHERE id='a'").run();
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM push_deliveries').get().n, 0);
  } finally {
    db.close();
  }
});
