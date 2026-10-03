import 'dotenv/config';
import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './auth.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const production = process.env.NODE_ENV === 'production';
if (production && !process.env.APP_ORIGIN?.startsWith('https://')) {
  throw new Error('Production requires an HTTPS APP_ORIGIN.');
}
const { app, db } = createApp({
  dbPath: process.env.DATABASE_PATH || resolve(root, 'data/bird-wanderer.sqlite'),
  origin: process.env.APP_ORIGIN || 'http://localhost:3000',
  secureCookies: production,
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
