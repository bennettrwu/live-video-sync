import {Static, Type} from '@sinclair/typebox';
import envSchema from 'env-schema';

export enum NODE_ENV {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum LOG_LEVEL {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Define environment schema
const SCHEMA = Type.Object({
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

const ENV = envSchema<Static<typeof SCHEMA>>({
  dotenv: true,
  schema: SCHEMA,
});

// Application configuration object
export const CONFIG = Object.freeze({
  nodeEnv: ENV.NODE_ENV,
  isDevelopment: ENV.NODE_ENV === NODE_ENV.DEVELOPMENT,
  isProduction: ENV.NODE_ENV === NODE_ENV.PRODUCTION,
  log: {
    level: ENV.LOG_LEVEL,
  },
  server: {
    host: ENV.HOST,
    port: ENV.PORT,
    requestTimeout: ENV.GLOBAL_REQUEST_TIMEOUT,
    connectionTimeout: ENV.GLOBAL_REQUEST_TIMEOUT,
    loginSessionTTL: ENV.LOGIN_SESSION_TTL,
    cookieSigningKey: ENV.COOKIE_SIGNING_KEY,
  },
  db: {
    url: `postgres://${ENV.POSTGRES_USER}:${ENV.POSTGRES_PASSWORD}@${ENV.POSTGRES_HOST}/${ENV.POSTGRES_DB}?sslmode=disable`,
  },
});

export type ConfigType = typeof CONFIG;
