import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/websocket': { target: 'http://0.0.0.0:14014', ws: true },
    },
  },
});
