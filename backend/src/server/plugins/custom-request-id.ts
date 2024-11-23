import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';
import {v4 as uuidv4} from 'uuid';

// Generate custom request ids
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  fastify.setGenReqId(req => (req.headers['request-id'] || req.headers['x-request-id'] || uuidv4()) as string);
});
