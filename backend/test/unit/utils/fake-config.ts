import {LOG_LEVEL, NODE_ENV, type ConfigType} from '@src/config/config.js';

export type Writeable<T> = {-readonly [P in keyof T]: T[P]};

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P];
};

export default function fakeConfig(override: RecursivePartial<ConfigType>): Writeable<ConfigType> {
  const defaultConfig: ConfigType = {
    nodeEnv: NODE_ENV.TEST,
    isDevelopment: false,
    isProduction: false,
    log: {
      level: LOG_LEVEL.DEBUG,
      file: './logs/test.log',
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
