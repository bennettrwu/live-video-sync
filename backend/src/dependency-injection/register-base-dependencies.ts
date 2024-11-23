import {asFunction, asValue, AwilixContainer} from 'awilix';
import {CONFIG, ConfigType} from '@config/config.js';
import createLogger, {Logger} from '@shared/logger/logger.js';
import liveVideoSyncDB, {LiveVideoSyncDB} from '@shared/live-video-sync-db/live-video-sync-db.js';

// Declare the types of objects contained in Awilix container
// New dependencies should update Dependencies interface in the global namespace

declare global {
  interface Dependencies {
    config: ConfigType;
    logger: Logger;
    liveVideoSyncDB: LiveVideoSyncDB;
  }
}

/**
 * Registers global dependencies with given dependency container
 * @param di
 * @returns updated dependency container
 */
export default function registerBaseDependencies(di: AwilixContainer): AwilixContainer<Dependencies> {
  di.register({
    config: asValue(CONFIG),
  });

  di.register({
    logger: asFunction(createLogger).scoped(),
  });

  di.register({
    liveVideoSyncDB: asFunction(liveVideoSyncDB).singleton(),
  });

  return di;
}
