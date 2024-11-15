import {FastifyReply, FastifyRequest} from 'fastify';
import {HTTP_ERRORS, HttpError} from '@shared/errors/http-errors.js';
import {APP_ERRORS, AppError} from '@shared/errors/app-errors.js';

/**
 * Custom fastify error handler to log errors and return response in consistent format
 * Error should be an instance of HttpError, otherwise logs non operational error and sends 500 response
 * @param err
 * @param req
 * @param reply
 */
export default function errorHandler(err: unknown, req: FastifyRequest, reply: FastifyReply) {
  if (err instanceof HttpError) {
    if (!err.isOperational) {
      req.log.error({msg: 'Request encountered a non operational error', err});
    } else {
      req.log.warn({msg: 'Request encountered an operational error', err});
    }

    if (err instanceof HTTP_ERRORS.BAD_REQUEST) {
      return reply
        .code(err.statusCode)
        .send({success: false, statusCode: err.statusCode, requestErrors: err.requestErrors, requestId: req.id});
    }

    return reply
      .code(err.statusCode)
      .send({success: false, statusCode: err.statusCode, message: err.message, requestId: req.id});
  }

  if (err instanceof AppError) {
    const error = new APP_ERRORS.UNCAUGHT_NON_HTTP_ERROR().causedBy(err);
    req.log.error({msg: 'Request cause', err: error});
  } else {
    const error = new APP_ERRORS.UNCAUGHT_UNKNOWN_ERROR().causedBy(err);
    req.log.error({msg: 'Request cause an unknown error that was not handled', err: error});
  }

  return reply.code(500).send({
    success: false,
    statusCode: 500,
    message: 'Sever encountered an unexpected error. Please try again later.',
    requestId: req.id,
  });
}
