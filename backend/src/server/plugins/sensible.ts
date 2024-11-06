import {fastifySensible} from '@fastify/sensible';
import {FastifyInstance} from 'fastify';
import fastifyPlugin from 'fastify-plugin';

export default fastifyPlugin((fastify: FastifyInstance) => {
  fastify.register(fastifySensible);
});
