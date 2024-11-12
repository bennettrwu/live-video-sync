import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';

// Logs when a request times out
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  fastify.addHook('onTimeout', (req, reply, done) => {
    req.log.warn({
      msg: 'request timed out',
      responseTime: reply.elapsedTime,
    });
    done();
  });
});
