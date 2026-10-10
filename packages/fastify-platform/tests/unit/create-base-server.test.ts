import { Type } from 'typebox';
import { afterAll, describe, expect, it } from 'vitest';

import { createBaseServer } from '#src/create-base-server.js';
import { HttpError } from '#src/errors/http-errors.js';

describe('createBaseServer', () => {
  const app = createBaseServer({ logLevel: 'silent' });
  app.get('/teapot', () => {
    throw new HttpError(418, 'teapot', 'I am a teapot');
  });
  app.get('/boom', () => {
    throw new Error('secret details');
  });
  app.get(
    '/items/:id',
    { schema: { params: Type.Object({ id: Type.Integer() }) } },
    (request) => ({ id: request.params.id }),
  );
  afterAll(() => app.close());

  it('answers unknown routes with a JSON 404', async () => {
    // Act
    const res = await app.inject({ method: 'GET', url: '/nope' });

    // Assert
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ statusCode: 404, code: 'not-found' });
  });

  it('maps HttpError to its status and code', async () => {
    // Act
    const res = await app.inject({ method: 'GET', url: '/teapot' });

    // Assert
    expect(res.statusCode).toBe(418);
    expect(res.json()).toEqual({
      statusCode: 418,
      code: 'teapot',
      message: 'I am a teapot',
    });
  });

  it('hides unexpected errors behind a 500', async () => {
    // Act
    const res = await app.inject({ method: 'GET', url: '/boom' });

    // Assert
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      statusCode: 500,
      code: 'internal-error',
      message: 'Internal server error',
    });
  });

  it('validates params with TypeBox and converts them', async () => {
    // Act
    const ok = await app.inject({ method: 'GET', url: '/items/7' });
    const bad = await app.inject({ method: 'GET', url: '/items/seven' });

    // Assert
    expect(ok.json()).toEqual({ id: 7 });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject({ code: 'bad-request' });
  });
});
