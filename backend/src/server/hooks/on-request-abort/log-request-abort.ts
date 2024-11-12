import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';

// Logs when a request is aborted
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  fastify.addHook('onRequestAbort', (req, done) => {
    req.log.info({msg: 'request aborted by client'});
    done();
  });
});
