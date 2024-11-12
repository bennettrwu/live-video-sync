import fastifyPlugin from 'fastify-plugin';
import {asValue} from 'awilix';
import {Logger} from '@shared/logger/logger.js';
import {AppFastifyInstance} from '@shared/types/fastify.js';

// Logs when a request is received and creates child logger instance with tracing context
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  fastify.addHook('onRequest', (req, reply, done) => {
    const requestid = req.id;
    const traceid = req.headers['x-b3-traceid'];
    const spanid = req.headers['x-b3-spanid'];
    const parentspanid = req.headers['x-b3-parentspanid'];
    const sampled = req.headers['x-b3-sampled'];
    const flags = req.headers['x-b3-flags'];

    const traceContext = {
      requestid,
      traceid,
      spanid,
      parentspanid,
      sampled,
      flags,
    };

    req.log = req.log.child({traceContext});
    req.diScope.register({logger: asValue(req.log as Logger)});

    req.log.info({
      msg: 'incoming request',
      method: req.method,
      url: req.url,
      path: req.routeOptions.url,
      parameters: req.params,
    });
    done();
  });
});
