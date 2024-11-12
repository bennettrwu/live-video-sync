import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';
import fastifyCookie from '@fastify/cookie';

// Register fastify helmet plugin to allow use of cookies and signing cookies
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  const config = fastify.diContainer.resolve('config');
  fastify.register(fastifyCookie, {
    secret: config.server.cookieSigningKey,
  });
});
