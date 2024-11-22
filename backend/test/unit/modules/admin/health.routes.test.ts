import healthRoute from '@src/modules/admin/health.route.js';
import {checkSuccessResponseFormat} from '@test/unit/test-utils/check-success-response-format.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/unit/test-utils/use-test-fastify-instance.js';
import {beforeEach, describe, it} from 'vitest';

describe('/admin/v1/health handler', () => {
  useTestFastifyInstance();
  beforeEach<FastifyTestContext>(context => context.fastify.register(healthRoute));

  it<FastifyTestContext>('returns 200', async ({fastify}) => {
    const response = await fastify.inject({method: 'GET', url: '/admin/v1/health'});

    checkSuccessResponseFormat(response, 200);
  });
});
