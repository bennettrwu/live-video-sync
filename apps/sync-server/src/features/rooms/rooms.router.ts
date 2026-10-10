import { Type } from 'typebox';

import {
  type BaseFastifyInstance,
  getDependencyContainer,
  registerWebSocketRoute,
} from '@live-video-sync/fastify-platform';
import {
  ClientMessageSchema,
  ServerMessageSchema,
} from '@live-video-sync/sync-protocol';

import type { AppDependencies } from '../../dependency-injection/app-dependencies.js';

const RoomParamsSchema = Type.Object({ code: Type.String({ minLength: 1 }) });

/**
 * Mounts the room lookup and the room websocket.
 */
export function registerRoomsRouter(app: BaseFastifyInstance): void {
  const controller =
    getDependencyContainer<AppDependencies>(app).cradle.roomsController;

  app.get(
    '/api/rooms/:code',
    { schema: { params: RoomParamsSchema } },
    (request, reply) => controller.getRoom(request, reply),
  );

  registerWebSocketRoute(app, {
    url: '/api/rooms/:code/ws',
    params: RoomParamsSchema,
    clientMessage: ClientMessageSchema,
    serverMessage: ServerMessageSchema,
    handler: (socket, request) => {
      controller.handleSocket(socket, request.params.code);
    },
  });
}
