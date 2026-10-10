import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { BaseFastifyInstance } from '@live-video-sync/fastify-platform';

import { buildServer } from '#src/build-server.js';

describe('buildServer', () => {
  let app: BaseFastifyInstance;

  beforeAll(async () => {
    app = await buildServer({
      port: 0,
      host: '127.0.0.1',
      roomsDir: './rooms',
      mediaDir: './does-not-exist',
      logLevel: 'silent',
    });
  });
  afterAll(() => app.close());

  it('answers the health check', async () => {
    // Act
    const res = await app.inject({ method: 'GET', url: '/healthz' });

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('looks up the committed demo room', async () => {
    // Act
    const found = await app.inject({ method: 'GET', url: '/api/rooms/demo' });
    const missing = await app.inject({ method: 'GET', url: '/api/rooms/nope' });

    // Assert
    expect(found.json()).toEqual({ code: 'demo', name: 'Demo room' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ code: 'unknown-room' });
  });
});
