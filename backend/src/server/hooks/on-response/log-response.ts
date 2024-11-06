import fastifyPlugin from 'fastify-plugin';
import {FastifyInstance} from 'fastify';

export default fastifyPlugin((fastify: FastifyInstance) => {
  fastify.addHook('onResponse', (req, res, done) => {
    // TODO Add better logging
    req.log.info({
      msg: 'request completed',
      res,
      responseTime: res.elapsedTime,
    });
    done();
  });
});
