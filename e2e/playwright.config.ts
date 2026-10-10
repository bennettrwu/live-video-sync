import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const FRONTEND_PORT = 3100;
const fixture = (rel: string) =>
  fileURLToPath(new URL(`./fixtures/${rel}`, import.meta.url));
const SERVER_PORT = 8100;

/**
 * Starts the real sync-server on a fixture rooms dir and a preview build of
 * the frontend, then runs every spec against them in Chromium.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${String(FRONTEND_PORT)}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npm run start --workspace apps/sync-server`,
      cwd: '..',
      url: `http://localhost:${String(SERVER_PORT)}/healthz`,
      reuseExistingServer: false,
      env: {
        PORT: String(SERVER_PORT),
        HOST: '127.0.0.1',
        ROOMS_DIR: fixture('rooms'),
        MEDIA_DIR: fixture('media'),
        LOG_LEVEL: 'warn',
      },
    },
    {
      command: `npm run build --workspace apps/frontend && npm run preview --workspace apps/frontend -- --port ${String(FRONTEND_PORT)} --strictPort`,
      cwd: '..',
      url: `http://localhost:${String(FRONTEND_PORT)}`,
      reuseExistingServer: false,
      env: { VITE_API_TARGET: `http://localhost:${String(SERVER_PORT)}` },
    },
  ],
});
