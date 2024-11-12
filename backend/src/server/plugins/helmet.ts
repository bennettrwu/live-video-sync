import fastifyHelmet from '@fastify/helmet';
import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';

// Register fastify helmet plugin to set secure security headers
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  fastify.register(fastifyHelmet);
});
