import {defineConfig} from 'vite';
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
      '/roomSyncAPI': {
        target: 'http://localhost:8000/',
        changeOrigin: true,
        ws: true,
      },
      '/userAPI': {
        target: 'http://localhost:8000/',
        changeOrigin: true,
      },
    },
  },
});
