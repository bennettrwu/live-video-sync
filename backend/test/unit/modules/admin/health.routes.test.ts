import {checkSuccessResponse} from '@test/unit/utils/check-response.js';
import type {FastifyTestContext} from '@test/unit/utils/use-test-fastify-instance.js';
import useTestFastifyInstance from '@test/unit/utils/use-test-fastify-instance.js';
import {beforeEach, describe, it} from 'vitest';

describe('/admin/v1/health handler', () => {
  beforeEach<FastifyTestContext>(context => {
    useTestFastifyInstance(context);
  });

  it<FastifyTestContext>('returns 200', async ({fastify}) => {
    const response = await fastify.inject({method: 'GET', url: '/admin/v1/health'});

    checkSuccessResponse(response, 200);
  });
});
