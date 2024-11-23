import logTimeout from '@server/hooks/on-timeout/log-timeout.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/utils/test-setup/use-test-fastify-instance.js';
import {type FastifyInstance} from 'fastify';
import {describe, expect} from 'vitest';

describe<FastifyTestContext>('Log timeout hook', it => {
  useTestFastifyInstance({server: {connectionTimeout: 100}});

  it('logs timeout event', async ({fastify, loggerMock}) => {
    fastify.register(logTimeout);
    fastify.register((f: FastifyInstance) => f.get('/test', () => {}));

    const address = await fastify.listen({port: 0});

    await expect(fetch(`${address}/test`)).rejects.toThrow();

    const logCall = loggerMock.warn.mock.calls[0][0] as unknown as {msg: string; responseTime: number};
    expect(logCall.msg).toBe('request timed out');
    expect(Math.abs(logCall.responseTime - 100)).toBeLessThan(10);
  });
});
