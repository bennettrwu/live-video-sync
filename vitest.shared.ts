import { defineConfig } from 'vitest/config';

/**
 * @see https://vitest.dev/config/
 * Shared vitest configuration for all workspaces
 */
export default defineConfig({
  resolve: {
    // Match the `development` condition used in package.json `exports`/`imports`
    // so `#src/*` and workspace packages resolve to source during tests, not dist.
    conditions: ['development'],
    // Vite 8 resolves tsconfig `paths` natively.
    tsconfigPaths: true,
  },
  test: {
    include: ['./tests/**/*.test.ts'],
    coverage: {
      enabled: true,
      include: ['src'],
      provider: 'istanbul',
      reporter: ['text', 'html', 'cobertura'],
    },
  },
});
