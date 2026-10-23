import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// A standalone service worker must be bundled separately from the React page.
await build({
  entryPoints: [fileURLToPath(new URL('../worker/push-worker.mjs', import.meta.url))],
  outfile: fileURLToPath(new URL('../public/push-worker.js', import.meta.url)),
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
});
