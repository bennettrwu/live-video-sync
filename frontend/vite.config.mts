import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // or "modern"
      },
    },
  },
  server: {
    proxy: {
      '/accounts': {
        target: 'http://localhost:8000/',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000/',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    include: ['./test/**/*.test.ts', './test/**/*.test.tsx'],
    coverage: {
      enabled: true,
      provider: 'istanbul' // or 'v8'
    },
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
  },
});
