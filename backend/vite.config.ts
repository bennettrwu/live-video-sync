import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['./test/**/*.test.ts'],
    coverage: {
      enabled: true,
      provider: 'istanbul', // or 'v8'
      include: ['src'],
      exclude: ['src/index.ts', 'src/shared/live-video-sync-db/live-video-sync-db.schema.ts']
    },
    server: {
      deps: {
        inline: ['@fastify/autoload', 'awilix']
      }
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@server': path.resolve(__dirname, './src/server'),
      '@src': path.resolve(__dirname, './src/'),
      '@test': path.resolve(__dirname, './test/'),
    },
  },
})