import logResponse from '@server/hooks/on-response/log-response.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/utils/test-setup/use-test-fastify-instance.js';
import {type FastifyInstance} from 'fastify';
import {describe, expect} from 'vitest';

describe<FastifyTestContext>('Log response hook', it => {
  useTestFastifyInstance({server: {connectionTimeout: 100}});

  it('logs response event', async ({fastify, loggerMock}) => {
    const code = 234;

    fastify.register(logResponse);
    fastify.register((f: FastifyInstance) => f.get('/test', (r, reply) => reply.code(code).send()));

    await fastify.inject({method: 'GET', url: '/test'});

    const logCall = loggerMock.info.mock.calls[0][0] as unknown as {
      msg: string;
      statusCode: number;
      responseTime: number;
    };
    expect(logCall.msg).toBe('request completed');
    expect(logCall.statusCode).toBe(code);
    expect(typeof logCall.responseTime).toBe('number');
  });
});
