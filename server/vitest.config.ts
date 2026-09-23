import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // khớp với alias "@/..." trong tsconfig
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
