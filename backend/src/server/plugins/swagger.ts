import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';
import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';

// Registers Swagger and Swagger UI to generate API documentation
export default fastifyPlugin(async (fastify: AppFastifyInstance) => {
  const config = fastify.diContainer.resolve('config');

  // Don't expose swagger if in production
  if (config.isProduction) return;

  await fastify.register(Swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Live Video Sync API',
        description: 'The Swagger API documentation for Live Video Sync API.',
        version: process.env.npm_package_version ?? '0.0.0',
      },
      tags: [
        {name: 'Accounts', description: 'Account management related endpoints'},
        {name: 'Admin', description: 'Administation related endpoints'},
      ],
      components: {
        securitySchemes: {
          sessionToken: {
            type: 'apiKey',
            name: 'sessionToken',
            in: 'cookie',
            description:
              'Session token required for authenticated endpoints. Note that setting a value here in SwaggerUI does not authenticate you, use the /accounts/v1/login endpoint instead.',
          },
        },
      },
    },
  });

  await fastify.register(SwaggerUI, {
    routePrefix: '/api-docs',
  });

  fastify.log.info('Swagger documentation is available at /api-docs');
});
