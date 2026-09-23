import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
// Render đặt sẵn RENDER_GIT_COMMIT cho mỗi lần build. Chạy máy local thì ghi 'dev'.
const commit = (process.env.RENDER_GIT_COMMIT ?? '').slice(0, 7) || 'dev';

// Dev: proxy /api -> backend NestJS (localhost:3000)
// Prod: đặt VITE_API_URL = origin của backend (vd https://api.comtrua.vn)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  /* Nhúng lúc build để app tự nói nó là bản nào — không phải mở DevTools đoán. */
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit),
    __APP_BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000', '/health': 'http://localhost:3000' },
  },
});
