import logRequest from '@server/hooks/on-request/log-request.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/utils/test-setup/use-test-fastify-instance.js';
import {type FastifyRequest} from 'fastify';
import {beforeEach, describe, expect, vi} from 'vitest';

describe<FastifyTestContext>('Log request hook', it => {
  useTestFastifyInstance();

  beforeEach<FastifyTestContext>(context => {
    context.fastify.register(logRequest);

    context.fastify.get('/test/:param1/:param2', context.routeHandlerMock);
  });

  it('logs incoming request event', async ({fastify, loggerMock}) => {
    await fastify.inject({method: 'GET', url: '/test/hello/world'});

    expect(loggerMock.info.mock.calls[0][0]).toEqual({
      msg: 'incoming request',
      method: 'GET',
      url: '/test/hello/world',
      path: '/test/:param1/:param2',
      parameters: {
        param1: 'hello',
        param2: 'world',
      },
    });
  });

  it('creates child logger with additional trace context', async ({fastify, defaultReqId, loggerMock}) => {
    const traceid = 'test-traceid';
    const spanid = 'test-spanid';
    const parentspanid = 'test-parentspanid';
    const sampled = 'test-sampled';
    const flags = 'test-flags';

    await fastify.inject({
      method: 'GET',
      url: '/test/hello/world',
      headers: {
        'x-b3-traceid': traceid,
        'x-b3-spanid': spanid,
        'x-b3-parentspanid': parentspanid,
        'x-b3-sampled': sampled,
        'x-b3-flags': flags,
      },
    });

    expect(loggerMock.child).toHaveBeenCalledWith({
      traceContext: {
        requestid: defaultReqId,
        traceid,
        spanid,
        parentspanid,
        sampled,
        flags,
      },
    });
  });

  it('creates child logger on request object', async ({fastify, routeHandlerMock, loggerMock}) => {
    const childLogger = {info: vi.fn()};
    loggerMock.child
      .mockImplementationOnce(() => loggerMock as never)
      .mockImplementationOnce(() => childLogger as never);

    await fastify.inject({method: 'GET', url: '/test/hello/world'});

    const req = routeHandlerMock.mock.calls[0][0] as FastifyRequest;
    expect(req.log).toBe(childLogger);
  });

  it('creates child logger in scoped dependency injection container', async ({
    fastify,
    routeHandlerMock,
    loggerMock,
  }) => {
    const childLogger = {info: vi.fn()};
    loggerMock.child
      .mockImplementationOnce(() => loggerMock as never)
      .mockImplementationOnce(() => childLogger as never);

    await fastify.inject({method: 'GET', url: '/test/hello/world'});

    const req = routeHandlerMock.mock.calls[0][0] as FastifyRequest;
    const logger = req.diScope.resolve('logger');
    expect(logger).toBe(childLogger);
  });
});
