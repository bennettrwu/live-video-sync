import type {RecursivePartial} from '@shared/types/recursive-partial.js';
import type {Writeable} from '@shared/types/writeable.js';
import {LOG_LEVEL, NODE_ENV, type ConfigType} from '@config/config-schema.js';

export default function fakeConfig(override?: RecursivePartial<ConfigType>): Writeable<ConfigType> {
  const defaultConfig: ConfigType = {
    nodeEnv: NODE_ENV.TEST,
    isDevelopment: false,
    isProduction: false,
    log: {
      level: LOG_LEVEL.DEBUG,
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
      url: 'postgres://does not exist',
    },
  };

  return Object.assign(defaultConfig, override);
}
