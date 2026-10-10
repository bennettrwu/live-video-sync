import type { FastifyRequest } from 'fastify';
import type { Static, TSchema } from 'typebox';

import type { BaseFastifyInstance } from '../create-base-server.js';
import { TypedSocket } from './typed-socket.js';

export interface WebSocketRouteOptions<
  TParams extends TSchema,
  TClient extends TSchema,
  TServer extends TSchema,
> {
  url: string;
  params?: TParams;
  clientMessage: TClient;
  /** Documents what the handler may send; `TypedSocket.send` is typed by it. */
  serverMessage: TServer;
  handler: (
    socket: TypedSocket<Static<TClient>, Static<TServer>>,
    request: FastifyRequest<{ Params: Static<TParams> }>,
  ) => void;
}

/**
 * Registers a websocket route whose handler receives a {@link TypedSocket}
 * instead of a raw `ws` socket. Requires `registerWebSocketPlugin` first.
 */
export function registerWebSocketRoute<
  TParams extends TSchema,
  TClient extends TSchema,
  TServer extends TSchema,
>(
  app: BaseFastifyInstance,
  options: WebSocketRouteOptions<TParams, TClient, TServer>,
): void {
  app.get(
    options.url,
    { websocket: true, schema: { params: options.params } },
    (socket, request) => {
      const typed = new TypedSocket<Static<TClient>, Static<TServer>>(
        socket,
        options.clientMessage,
      );
      options.handler(
        typed,
        request as FastifyRequest<{ Params: Static<TParams> }>,
      );
    },
  );
}
