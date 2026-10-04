import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, preview } from 'vite';
import { createApp } from './auth.mjs';
import { createDiscoveryService } from './discovery.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const configFile = join(root, 'vite.config.ts');
const origin = 'http://localhost:3000';

for (const mode of ['development', 'preview']) {
  test(`${mode} proxies authentication and discovery to the configured API port`, async (t) => {
    const discovery = createDiscoveryService({ apiKey: 'proxy-test-key', fetchImpl: async () => Response.json([]) });
    const { app, db } = createApp({ origin, discovery });
    const api = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => api.once('listening', resolve));
    t.after(async () => {
      await new Promise((resolve) => api.close(resolve));
      db.close();
    });

    const previous = { PORT: process.env.PORT, HOST: process.env.HOST, APP_ORIGIN: process.env.APP_ORIGIN };
    process.env.PORT = String(api.address().port);
    process.env.HOST = '127.0.0.1';
    process.env.APP_ORIGIN = origin;
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
  });
}
