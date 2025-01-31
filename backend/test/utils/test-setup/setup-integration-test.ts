import {LOG_LEVEL, NODE_ENV, type ConfigType} from '@config/config-schema.js';
import {useTestDb} from './use-test-db.js';
import {beforeEach, vi} from 'vitest';
import type {TestContext} from 'node:test';
import type {LiveVideoSyncDB} from '@shared/live-video-sync-db/live-video-sync-db.js';
import type {AppFastifyInstance} from '@shared/types/fastify.js';
import createServer from '@server/create-server.js';
import createDependencyContainer from '@src/dependency-injection/create-dependency-container.js';
import {type AwilixContainer} from 'awilix';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

export interface IntegrationTestContext extends TestContext {
  db: LiveVideoSyncDB;
  connectionString: string;
  config: ConfigType;
  fastify: AppFastifyInstance;
  container: AwilixContainer<Dependencies>;
  fakeTime: Date;
  fakeRequestId: string;
}

export default function setupIntegrationTest() {
  useTestDb();

  beforeEach<IntegrationTestContext>(async context => {
    context.fakeTime = new Date(2024, 11, 14);
    vi.setSystemTime(context.fakeTime);

    context.config = {
      nodeEnv: NODE_ENV.TEST,
      isDevelopment: false,
      isProduction: false,
      log: {
        level: LOG_LEVEL.SILENT,
      },
      server: {
        host: 'localhost',
        port: 8888,
        requestTimeout: 5_000,
        connectionTimeout: 5_000,
        loginSessionTTL: 5_000,
        cookieSigningKey: 'secret',
      },
      db: {
        url: context.connectionString,
      },
    };

    context.container = await createDependencyContainer(path.join(DIRNAME, '../../../src'), context.config);
    context.fastify = createServer(context.container);

    context.fakeRequestId = 'testRequestId';
    // context.fastify.setGenReqId(() => context.fakeRequestId);
  });
}
