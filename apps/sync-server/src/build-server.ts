import {
  type BaseFastifyInstance,
  createBaseServer,
  createDependencyContainer,
  registerDependencyInjection,
  registerWebSocketPlugin,
} from '@live-video-sync/fastify-platform';

import type { AppConfig } from './app-config.js';
import type { AppDependencies } from './dependency-injection/app-dependencies.js';
import {
  type DependencyOverrides,
  registerAppDependencies,
} from './dependency-injection/register-dependencies.js';
import { registerMediaRouter } from './features/media/media.router.js';
import { registerProbesRouter } from './features/probes/probes.router.js';
import { registerRoomsRouter } from './features/rooms/rooms.router.js';

/**
 * Builds the server without listening so tests can drive it with `inject()`
 * or an ephemeral port.
 */
export async function buildServer(
  config: AppConfig,
  overrides: DependencyOverrides = {},
): Promise<BaseFastifyInstance> {
  const app = createBaseServer({ logLevel: config.logLevel });

  const container = createDependencyContainer<AppDependencies>();
  registerAppDependencies(container, config, overrides);
  await registerDependencyInjection(app, container);
  await registerWebSocketPlugin(app);

  registerProbesRouter(app);
  registerRoomsRouter(app);
  await registerMediaRouter(app, config.mediaDir);

  return app;
}
