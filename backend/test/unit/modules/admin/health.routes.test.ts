import healthRoute from '@src/modules/admin/health.route.js';
import {checkSuccessResponseFormat} from '@test/unit/test-utils/check-success-response-format.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/unit/test-utils/use-test-fastify-instance.js';
import {beforeEach, describe} from 'vitest';

describe<FastifyTestContext>('/admin/v1/health handler', it => {
  useTestFastifyInstance();
  beforeEach<FastifyTestContext>(context => context.fastify.register(healthRoute));

  it('returns 200', async ({fastify}) => {
    const response = await fastify.inject({method: 'GET', url: '/admin/v1/health'});

    checkSuccessResponseFormat(response, 200);
  });
});
