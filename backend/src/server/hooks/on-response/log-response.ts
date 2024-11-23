import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';

// Logs when a request has completed successfully
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  fastify.addHook('onResponse', (req, reply, done) => {
    req.log.info({
      msg: 'request completed',
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    });
    done();
  });
});
