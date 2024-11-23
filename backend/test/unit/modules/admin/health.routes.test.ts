import healthRoute from '@src/modules/admin/health.route.js';
import {checkSuccessResponseFormat} from '@test/utils/validators/check-success-response-format.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/utils/test-setup/use-test-fastify-instance.js';
import {beforeEach, describe} from 'vitest';

describe<FastifyTestContext>('/admin/v1/health handler', it => {
  useTestFastifyInstance();
  beforeEach<FastifyTestContext>(context => context.fastify.register(healthRoute));

  it('returns 200', async ({fastify, defaultReqId}) => {
    const response = await fastify.inject({method: 'GET', url: '/admin/v1/health'});

    checkSuccessResponseFormat(response, 200, defaultReqId);
  });
});
