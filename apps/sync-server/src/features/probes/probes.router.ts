import {
  type BaseFastifyInstance,
  getDependencyContainer,
} from '@live-video-sync/fastify-platform';

import type { AppDependencies } from '../../dependency-injection/app-dependencies.js';

export function registerProbesRouter(app: BaseFastifyInstance): void {
  const controller =
    getDependencyContainer<AppDependencies>(app).cradle.probesController;

  app.get('/healthz', () => controller.liveness());
}
