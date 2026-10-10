import { fastifyWebsocket } from '@fastify/websocket';

import type { BaseFastifyInstance } from '../create-base-server.js';

/**
 * Enables `websocket: true` routes. Must complete before such routes are
 * registered, so callers await it.
 */
export async function registerWebSocketPlugin(
  app: BaseFastifyInstance,
): Promise<void> {
  await app.register(fastifyWebsocket);
}
