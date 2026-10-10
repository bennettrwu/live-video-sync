/// <reference types="vite/client" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = process.env['VITE_API_TARGET'] ?? 'http://localhost:8080';
const proxy = {
  '/api': { target: apiTarget, ws: true },
  '/media': { target: apiTarget },
};

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    // Resolve workspace packages to their source (see package.json `exports`).
    conditions: ['development'],
    tsconfigPaths: true,
  },
  server: { port: 3000, proxy },
  preview: { proxy },
});
