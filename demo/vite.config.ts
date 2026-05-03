import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['6wz4e8-212-164-179-86.ru.tuna.am', '*'],
  },
  server: {
    port: 5125,
    /* Uncomment and set target to your tinytrack gateway for local dev:
    proxy: {
      '/v1': { target: 'http://localhost:14020', ws: true },
      '/websocket': { target: 'http://localhost:14020', ws: true },
    },
    */
  },
});
