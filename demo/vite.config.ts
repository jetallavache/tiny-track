import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /* Uncomment and set target to your tinytrack gateway for local dev:
    */
    proxy: {
      '/v1': { target: 'http://localhost:14020', ws: true },
      '/websocket': { target: 'http://localhost:14020', ws: true },
    },
  },
});
