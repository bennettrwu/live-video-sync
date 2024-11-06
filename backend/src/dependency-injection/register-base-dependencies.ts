import {asFunction, asValue, AwilixContainer} from 'awilix';
import {config, ConfigType} from '../config/config';
import createLogger, {Logger} from '../shared/logger/logger';
import * as liveVideoSyncDBSchema from '../shared/live-video-sync-db/live-video-sync-db.schema';
import liveVideoSyncDB, {LiveVideoSyncDB} from '../shared/live-video-sync-db/live-video-sync-db';

declare global {
  interface Dependencies {
    config: ConfigType;
    logger: Logger;
    liveVideoSyncDB: LiveVideoSyncDB;
    liveVideoSyncDBSchema: typeof liveVideoSyncDBSchema;
  }
}

export function registerBaseDependencies(di: AwilixContainer) {
  di.register({
    config: asValue(config),
  });

  di.register({
    logger: asFunction(createLogger).scoped(),
  });

  di.register({
    liveVideoSyncDB: asFunction(liveVideoSyncDB).singleton(),
  });

  di.register({
    liveVideoSyncDBSchema: asValue(liveVideoSyncDBSchema),
  });

  return di;
}
