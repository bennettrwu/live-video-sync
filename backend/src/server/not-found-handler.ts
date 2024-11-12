import type {FastifyReply, FastifyRequest} from 'fastify';
import {HTTP_ERRORS} from '../shared/errors/http-errors.js';

/**
 * Custom handler for fastify not found errors to log error and return response in consistent format
 * @param req
 * @param reply
 */
export default function notFoundHandler(req: FastifyRequest, reply: FastifyReply) {
  const err = new HTTP_ERRORS.NOT_FOUND(`Route ${req.method}: ${req.url} not found`);
  req.log.warn({msg: 'Requested route not found', err});

  return reply.code(404).send({
    success: false,
    statusCode: 404,
    message: `Route ${req.method}: ${req.url} not found`,
    requestId: req.id,
  });
}
