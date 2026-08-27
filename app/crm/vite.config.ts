import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Served from https://cocomadigital.com/crm in production (Apache serves
  // dist/ with a history fallback), so every emitted asset URL has to carry the
  // prefix. Paired with basename="/crm" in main.tsx.
  base: '/crm/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    // Mirrors the production Apache rules, so dev and prod agree on which paths
    // belong to the API and which to the SPA.
    proxy: {
      '/crm/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // The realtime inbox. src/services/socket.ts connects to the page origin
      // (:5174 in dev) on this path; without a ws-aware proxy the handshake hits
      // the Vite server, which knows nothing about it, and the inbox never goes
      // live locally even though it works in production.
      '/crm/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
