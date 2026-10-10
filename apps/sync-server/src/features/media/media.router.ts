import { fastifyStatic } from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { BaseFastifyInstance } from '@live-video-sync/fastify-platform';

/**
 * Serves the media directory at `/media/` for development. Production puts
 * nginx in front instead. Skipped when the directory does not exist.
 */
export async function registerMediaRouter(
  app: BaseFastifyInstance,
  mediaDir: string,
): Promise<void> {
  const root = resolve(mediaDir);
  if (!existsSync(root)) {
    app.log.info({ root }, 'media directory missing; /media not served');
    return;
  }

  await app.register(fastifyStatic, {
    root,
    prefix: '/media/',
    decorateReply: false,
  });
}
