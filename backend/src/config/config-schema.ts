import {Type} from '@sinclair/typebox';

export enum NODE_ENV {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum LOG_LEVEL {
  SILENT = 'silent',
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Define environment schema
export const SCHEMA = Type.Object({
  NODE_ENV: Type.Enum(NODE_ENV),

  LOG_LEVEL: Type.Enum(LOG_LEVEL),

  HOST: Type.String({default: 'localhost'}),
  PORT: Type.Number({default: 8000}),
  GLOBAL_REQUEST_TIMEOUT: Type.Number({default: 5_000}),
  GLOBAL_CONNECTION_TIMEOUT: Type.Number({default: 5_000}),
  LOGIN_SESSION_TTL: Type.Number({default: 60 * 60 * 1_000}),
  COOKIE_SIGNING_KEY: Type.String({minLength: 32}),

  POSTGRES_HOST: Type.String(),
  POSTGRES_PASSWORD: Type.String(),
  POSTGRES_USER: Type.String(),
  POSTGRES_DB: Type.String(),
});

export type ConfigType = Readonly<{
  nodeEnv: NODE_ENV;
  isDevelopment: boolean;
  isProduction: boolean;
  log: {
    level: string;
  };
  server: {
    host: string;
    port: number;
    requestTimeout: number;
    connectionTimeout: number;
    loginSessionTTL: number;
    cookieSigningKey: string;
  };
  db: {
    url: string;
  };
}>;
