import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { tunnelOrigin } from './scripts/tunnel-config.mjs';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const tunnel = tunnelOrigin(env.TUNNEL_ORIGIN);
  const allowedHosts = tunnel ? [new URL(tunnel).hostname] : [];
  const origin = new URL(env.APP_ORIGIN || 'http://localhost:3000');
  const port = Number(origin.port || 3000);
  const apiPort = Number(env.PORT || 3001);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error('PORT must be a valid API port between 1 and 65535.');
  }
  const apiHost = !env.HOST || ['0.0.0.0', '::'].includes(env.HOST) ? '127.0.0.1' : env.HOST;
  const proxy = { '/api': `http://${apiHost.includes(':') ? `[${apiHost}]` : apiHost}:${apiPort}` };
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: env.FRONTEND_HOST || '127.0.0.1',
      port,
      strictPort: true,
      allowedHosts,
      proxy,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: { port, host: env.FRONTEND_HOST || '127.0.0.1', strictPort: true, proxy, allowedHosts },
  };
});
