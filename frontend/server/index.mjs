import 'dotenv/config';
import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './auth.mjs';
import { createDiscoveryService } from './discovery.mjs';
import { tunnelOrigin } from '../scripts/tunnel-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const production = process.env.NODE_ENV === 'production';
const additionalOrigins = (process.env.ADDITIONAL_APP_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
const tunnel = tunnelOrigin(process.env.TUNNEL_ORIGIN);
if (tunnel) additionalOrigins.push(tunnel);
for (const origin of additionalOrigins) {
  const parsed = new URL(origin);
  if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol) || (production && parsed.protocol !== 'https:')) {
    throw new Error('ADDITIONAL_APP_ORIGINS must contain exact HTTP origins (HTTPS in production), without paths.');
  }
}
if (production && !process.env.APP_ORIGIN?.startsWith('https://')) {
  throw new Error('Production requires an HTTPS APP_ORIGIN.');
}
const { app, db } = createApp({
  dbPath: process.env.DATABASE_PATH || resolve(root, 'data/bird-wanderer.sqlite'),
  origin: process.env.APP_ORIGIN || 'http://localhost:3000',
  additionalOrigins,
  secureCookies: production,
  discovery: createDiscoveryService({ apiKey: process.env.EBIRD_API_KEY, region: process.env.EBIRD_REGION || 'IN-DL' }),
});
if (production) {
  app.use(express.static(resolve(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(resolve(root, 'dist/index.html')));
}
const server = app.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => {
  console.log(`Bird Wanderer API listening on port ${server.address().port}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(() => { db.close(); process.exit(0); });
});
