import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';

// Ensures tracing headers are forwarded on replies
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  fastify.addHook('onSend', (req, reply, payload, done) => {
    const requestid = req.id;
    const traceid = req.headers['x-b3-traceid'];
    const spanid = req.headers['x-b3-spanid'];
    const parentspanid = req.headers['x-b3-parentspanid'];
    const sampled = req.headers['x-b3-sampled'];
    const flags = req.headers['x-b3-flags'];

    reply.header('x-request-id', requestid);
    reply.header('x-b3-traceid', traceid);
    reply.header('x-b3-spanid', spanid);
    reply.header('x-b3-parentspanid', parentspanid);
    reply.header('x-b3-sampled', sampled);
    reply.header('x-b3-flags', flags);

    done();
  });
});
