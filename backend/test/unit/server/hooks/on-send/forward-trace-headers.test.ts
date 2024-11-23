import forwardTraceHeaders from '@server/hooks/on-send/forward-trace-headers.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/unit/test-utils/use-test-fastify-instance.js';
import {type FastifyInstance} from 'fastify';
import {beforeEach, describe, expect} from 'vitest';

describe<FastifyTestContext>('Forward trace headers hook', it => {
  const traceid = 'test-traceid';
  const spanid = 'test-spanid';
  const parentspanid = 'test-parentspanid';
  const sampled = 'test-sampled';
  const flags = 'test-flags';

  useTestFastifyInstance({server: {connectionTimeout: 100}});

  beforeEach<FastifyTestContext>(context => {
    context.fastify.register(forwardTraceHeaders);
    context.fastify.register((f: FastifyInstance) => f.get('/test', context.routeHandlerMock));
  });

  it('forwards trace headers when defined', async ({fastify}) => {
    const headers = {
      'x-b3-traceid': traceid,
      'x-b3-spanid': spanid,
      'x-b3-parentspanid': parentspanid,
      'x-b3-sampled': sampled,
      'x-b3-flags': flags,
    };

    const response = await fastify.inject({
      method: 'GET',
      url: '/test',
      headers,
    });

    expect(response.headers).toMatchObject(headers);
  });

  it('leaves undefined trace headers blank if not defined', async ({fastify}) => {
    const headers = {
      'x-b3-traceid': traceid,
      'x-b3-flags': flags,
    };

    const response = await fastify.inject({
      method: 'GET',
      url: '/test',
      headers,
    });

    expect(response.headers).toMatchObject({
      'x-b3-traceid': traceid,
      'x-b3-spanid': '',
      'x-b3-parentspanid': '',
      'x-b3-sampled': '',
      'x-b3-flags': flags,
    });
  });
});
