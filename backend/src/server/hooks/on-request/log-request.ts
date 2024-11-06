import {FastifyInstance} from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import {asValue} from 'awilix';
import {Logger} from '../../../shared/logger/logger';
import {v4 as uuidv4} from 'uuid';

export default fastifyPlugin((fastify: FastifyInstance) => {
  fastify.addHook('onRequest', (req, res, done) => {
    // TODO Add better logging
    const reqId = (req.headers['request-id'] || req.headers['x-request-id'] || uuidv4()) as string;

    req.id = reqId;
    req.log = req.log.child({reqId});
    req.diScope.register({
      logger: asValue(req.log as Logger),
    });
    req.log.info({msg: 'incoming request', req});
    done();
  });
});
