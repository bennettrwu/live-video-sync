import { fastifySensible } from '@fastify/sensible';
import {
  type TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
} from '@fastify/type-provider-typebox';
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
} from 'fastify';
import type { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

import { createLogger } from './create-logger.js';
import { type ErrorReply, HttpError } from './errors/http-errors.js';

export interface BaseServerOptions {
  logLevel?: string;
}

export type BaseFastifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  Logger,
  TypeBoxTypeProvider
>;

/**
 * Creates a Fastify instance with the platform defaults: pino logging, uuid
 * request ids, TypeBox validation, sensible helpers, and JSON error replies.
 * @returns a server that has not started listening
 */
export function createBaseServer(
  options: BaseServerOptions = {},
): BaseFastifyInstance {
  const app = Fastify({
    loggerInstance: createLogger(options.logLevel ?? 'info'),
    genReqId: () => uuidv4(),
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.setValidatorCompiler(TypeBoxValidatorCompiler);
  void app.register(fastifySensible);
  app.setErrorHandler(handleError);
  app.setNotFoundHandler(handleNotFound);

  return app;
}

function handleError(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof HttpError) {
    return reply.code(error.statusCode).send(toErrorReply(error));
  }

  if (error.validation !== undefined) {
    return reply.code(400).send({
      statusCode: 400,
      code: 'bad-request',
      message: error.message,
    } satisfies ErrorReply);
  }

  if (error.statusCode !== undefined && error.statusCode < 500) {
    return reply.code(error.statusCode).send({
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    } satisfies ErrorReply);
  }

  request.log.error(error);
  return reply.code(500).send({
    statusCode: 500,
    code: 'internal-error',
    message: 'Internal server error',
  } satisfies ErrorReply);
}

function handleNotFound(
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  return reply.code(404).send({
    statusCode: 404,
    code: 'not-found',
    message: `Route ${request.method}:${request.url} not found`,
  } satisfies ErrorReply);
}

function toErrorReply(error: HttpError): ErrorReply {
  return {
    statusCode: error.statusCode,
    code: error.code,
    message: error.message,
  };
}
