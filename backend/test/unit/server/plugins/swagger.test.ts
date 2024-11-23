import swagger from '@server/plugins/swagger.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/utils/test-setup/use-test-fastify-instance.js';
import {describe, expect} from 'vitest';

describe<FastifyTestContext>('Swagger', it => {
  useTestFastifyInstance();

  it('serves swagger UI if not in production', async ({fastify}) => {
    fastify.register(swagger);

    const response = await fastify.inject({method: 'GET', url: '/api-docs'});

    expect(response.statusCode).toBe(200);
  });

  it('does not serve swagger UI if in production', async ({fastify, config}) => {
    config.isProduction = true;
    fastify.register(swagger);

    const response = await fastify.inject({method: 'GET', url: '/api-docs'});

    expect(response.statusCode).toBe(404);
  });
});
