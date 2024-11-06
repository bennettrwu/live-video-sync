import Swagger from '@fastify/swagger';
import SwaggerUI from '@fastify/swagger-ui';
import {FastifyInstance} from 'fastify';
import fastifyPlugin from 'fastify-plugin';

export default fastifyPlugin(async (fastify: FastifyInstance) => {
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
    },
  });

  await fastify.register(SwaggerUI, {
    routePrefix: '/api-docs',
  });

  fastify.log.info('Swagger documentation is available at /api-docs');
});
