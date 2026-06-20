import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: proxy /api -> backend NestJS (localhost:3000)
// Prod: đặt VITE_API_URL = origin của backend (vd https://api.comtrua.vn)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
