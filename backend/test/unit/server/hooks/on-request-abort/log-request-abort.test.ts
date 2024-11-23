import logRequestAbort from '@server/hooks/on-request-abort/log-request-abort.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/utils/test-setup/use-test-fastify-instance.js';
import {type FastifyInstance} from 'fastify';
import {describe, expect} from 'vitest';

describe<FastifyTestContext>('Log request abort hook', it => {
  useTestFastifyInstance();

  it('logs request abort event', async ({fastify, loggerMock}) => {
    fastify.register(logRequestAbort);
    fastify.register((f: FastifyInstance) => f.get('/test', () => {}));

    const address = await fastify.listen({port: 0});
    loggerMock.info.mockClear(); // clear server listening message

    const controller = new AbortController();
    const abort = new Promise<void>(r =>
      setTimeout(() => {
        controller.abort();
        setTimeout(() => r(), 100);
      }, 100),
    );

    await expect(fetch(`${address}/test`, {signal: controller.signal})).rejects.toThrow();
    await abort;

    expect(loggerMock.info.mock.calls[0][0]).toEqual({msg: 'request aborted by client'});
  });
});
