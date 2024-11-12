import {
  FastifyReply,
  FastifyRequest,
  RawRequestDefaultExpression,
  RawServerDefault,
  RawReplyDefaultExpression,
  ContextConfigDefault,
  FastifyInstance,
} from 'fastify';
import {RouteGenericInterface} from 'fastify/types/route.js';
import {FastifySchema} from 'fastify/types/schema.js';
import {TypeBoxTypeProvider} from '@fastify/type-provider-typebox';
import {Server} from 'http';
import {Logger} from '@shared/logger/logger.js';

// Some custom types for Fastify to properly type requests and replies according to route schema
export type AppFastifyRequest<TSchema extends FastifySchema> = FastifyRequest<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  TSchema,
  TypeBoxTypeProvider
>;

export type AppFastifyReply<TSchema extends FastifySchema> = FastifyReply<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  ContextConfigDefault,
  TSchema,
  TypeBoxTypeProvider
>;

export type AppFastifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<Server>,
  RawReplyDefaultExpression<Server>,
  Logger,
  TypeBoxTypeProvider
>;
