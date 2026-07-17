import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Fail loudly if 3000 is taken instead of silently drifting to another port
      // (a stale vite once hijacked 3000 and collided with the PTY server on 3001).
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Allow access through Cloudflare tunnel hostnames (vite blocks unknown Hosts by default)
      allowedHosts: ['.trycloudflare.com'],
      // Same-origin proxy: a single tunnel to :3000 reaches every backend.
      // WS servers ignore the request path, so no rewrite needed for /ws/*.
      proxy: {
        '/ws/pty': {target: 'ws://localhost:3001', ws: true},
        '/ws/portal': {target: 'ws://localhost:3003', ws: true},
        '/api': {target: 'http://localhost:3002'},
        '/portal': {
          target: 'http://localhost:3003',
          rewrite: (p) => p.replace(/^\/portal/, ''),
        },
      },
    },
  };
});
