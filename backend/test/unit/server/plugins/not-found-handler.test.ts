import type {FastifyInstance} from 'fastify';
import Fastify from 'fastify';
import type {Logger} from 'pino';
import {beforeEach, describe, expect, type Mocked, type TestContext} from 'vitest';
import fakeLogger from '../../../utils/fakes/fake-logger.js';
import notFoundHandler from '@server/plugins/not-found-handler.js';

interface LocalTestContext extends TestContext {
  fastify: FastifyInstance;
  loggerMock: Mocked<Logger>;
}

describe<LocalTestContext>('Error handler', it => {
  const requestId = 'testid';

  beforeEach<LocalTestContext>(context => {
    context.loggerMock = fakeLogger();
    context.fastify = Fastify({
      genReqId: () => requestId,
      loggerInstance: context.loggerMock,
    }) as unknown as FastifyInstance;

    context.fastify.register(notFoundHandler);
  });

  it('returns correct response when route is not found', async ({fastify}) => {
    const response = await fastify.inject({method: 'GET', url: '/test'});

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      statusCode: 404,
      success: false,
      message: 'Route GET: /test not found',
      requestId,
    });
  });

  it('logs warning when route is not found', async ({fastify, loggerMock}) => {
    await fastify.inject({method: 'GET', url: '/test'});

    expect(loggerMock.warn).toHaveBeenCalledOnce();
  });
});
