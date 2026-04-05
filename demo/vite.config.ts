import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/websocket': { target: 'ws://localhost:25015', ws: true },
    },
  },
});
