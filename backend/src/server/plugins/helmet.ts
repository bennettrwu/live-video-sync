import fastifyHelmet from '@fastify/helmet';
import {FastifyInstance} from 'fastify';
import fastifyPlugin from 'fastify-plugin';

export default fastifyPlugin((fastify: FastifyInstance) => {
  fastify.register(fastifyHelmet);
});
