import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request as httpRequest } from 'node:http';
import { createServer, preview } from 'vite';
import { createApp } from './auth.mjs';
import { createDiscoveryService } from './discovery.mjs';
import { quickTunnelOrigin, tunnelOrigin } from '../scripts/tunnel-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const configFile = join(root, 'vite.config.ts');
const origin = 'http://localhost:3000';
const tunnel = 'https://demo-bird-wanderer.trycloudflare.com';

function hostStatus(url, host) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { headers: { Host: host } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on('error', reject);
    request.end();
  });
}

test('tunnel discovery handles split log text and exact HTTPS origins', () => {
  assert.equal(quickTunnelOrigin('log https://demo-bird-wanderer.trycloudflare.com |'), tunnel);
  assert.equal(quickTunnelOrigin('https://demo-bird'), null);
  assert.equal(tunnelOrigin(undefined), null);
  assert.equal(tunnelOrigin(tunnel), tunnel);
  assert.equal(tunnelOrigin('https://birds.example.org'), 'https://birds.example.org');
  for (const value of ['http://birds.example.org', `${tunnel}/`, `${tunnel}/path`, 'https://user:pass@birds.example.org']) {
    assert.throws(() => tunnelOrigin(value));
  }
});

for (const mode of ['development', 'preview']) {
  test(`${mode} proxies authentication and discovery to the configured API port`, async (t) => {
    const discovery = createDiscoveryService({ apiKey: 'proxy-test-key', fetchImpl: async () => Response.json([]) });
    const { app, db } = createApp({ origin, additionalOrigins: [tunnelOrigin(tunnel)], discovery });
    const api = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => api.once('listening', resolve));
    t.after(async () => {
      await new Promise((resolve) => api.close(resolve));
      db.close();
    });

    const previous = { PORT: process.env.PORT, HOST: process.env.HOST, APP_ORIGIN: process.env.APP_ORIGIN, TUNNEL_ORIGIN: process.env.TUNNEL_ORIGIN };
    process.env.PORT = String(api.address().port);
    process.env.HOST = '127.0.0.1';
    process.env.APP_ORIGIN = origin;
    process.env.TUNNEL_ORIGIN = tunnel;
    t.after(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });

    let frontend;
    if (mode === 'development') {
      frontend = await createServer({ root, configFile, mode: 'test', server: { port: 0, host: '127.0.0.1', strictPort: false, hmr: false } });
      await frontend.listen();
      t.after(() => frontend.close());
    } else {
      const directory = mkdtempSync(join(tmpdir(), 'bird-wanderer-preview-'));
      writeFileSync(join(directory, 'index.html'), '<!doctype html><title>Proxy test</title>');
      t.after(() => {
        if (dirname(directory) === tmpdir() && basename(directory).startsWith('bird-wanderer-preview-')) {
          rmSync(directory, { recursive: true, force: true });
        }
      });
      frontend = await preview({ root, configFile, mode: 'test', build: { outDir: directory }, preview: { port: 0, host: '127.0.0.1', strictPort: false } });
      t.after(() => new Promise((resolve) => frontend.httpServer.close(resolve)));
    }

    const url = `http://127.0.0.1:${frontend.httpServer.address().port}`;
    const response = await fetch(`${url}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ name: 'Proxy Observer', email: `${mode}@example.test`, password: 'test-password-12345' }),
    });
    assert.equal(response.status, 201);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    const me = await fetch(`${url}/api/auth/me`, { headers: { Cookie: cookie.split(';')[0] } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.name, 'Proxy Observer');
    const catalogue = await fetch(`${url}/api/discovery/catalogue`, { headers: { Cookie: cookie.split(';')[0] } });
    assert.equal(catalogue.status, 200);
    assert.equal((await catalogue.json()).source, 'eBird');
    const forbidden = await fetch(`${url}/api/auth/logout`, { method: 'POST', headers: { Origin: 'https://untrusted.example' } });
    assert.equal(forbidden.status, 403);
    const tunnelLogin = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: tunnel, Host: new URL(tunnel).hostname },
      body: JSON.stringify({ email: `${mode}@example.test`, password: 'test-password-12345' }),
    });
    assert.equal(tunnelLogin.status, 200);
    assert.equal(await hostStatus(url, new URL(tunnel).hostname), 200);
    assert.equal(await hostStatus(url, 'another-tunnel.trycloudflare.com'), 403);
    const wrongOrigin = await fetch(`${url}/api/auth/logout`, {
      method: 'POST', headers: { Origin: 'https://another-tunnel.trycloudflare.com', Host: new URL(tunnel).hostname },
    });
    assert.equal(wrongOrigin.status, 403);
  });
}
