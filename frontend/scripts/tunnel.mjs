import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import { quickTunnelOrigin, tunnelOrigin } from './tunnel-config.mjs';

const port = new URL(process.env.APP_ORIGIN || 'http://localhost:3000').port || '3000';
const children = [];
let stopping = false;
let started = false;
let output = '';
let timer;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else child.kill();
  }
  process.exitCode = code;
}

function watch(child) {
  children.push(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => stop(code || 0));
  return child;
}

function start(origin) {
  if (started || stopping) return;
  started = true;
  clearTimeout(timer);
  console.log(`\nBird Wanderer tunnel: ${origin}\nLocal access: http://localhost:${port}\n`);
  watch(spawn(process.execPath, ['scripts/dev.mjs'], {
    stdio: 'inherit', env: { ...process.env, TUNNEL_ORIGIN: origin },
  }));
}

// A named or separately managed tunnel can supply its exact public origin.
const suppliedOrigin = tunnelOrigin(process.env.TUNNEL_ORIGIN);
if (suppliedOrigin) {
  start(suppliedOrigin);
} else {
  const tunnel = watch(spawn(process.env.CLOUDFLARED_PATH || 'cloudflared', [
    'tunnel', '--url', `http://localhost:${port}`,
  ], { stdio: ['ignore', 'pipe', 'pipe'] }));
  timer = setTimeout(() => {
    console.error('No Cloudflare URL received within 60 seconds. Check cloudflared connectivity/configuration.');
    stop(1);
  }, 60000);
  for (const stream of [tunnel.stdout, tunnel.stderr]) stream.on('data', (chunk) => {
    process.stderr.write(chunk);
    output = (output + chunk.toString()).slice(-16384);
    const origin = quickTunnelOrigin(output);
    if (origin) start(origin);
  });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
