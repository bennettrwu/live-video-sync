import {Static, Type} from '@sinclair/typebox';
import envSchema from 'env-schema';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum LogLevel {
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error',
}

const schema = Type.Object({
  NODE_ENV: Type.Enum(NodeEnv),

  LOG_LEVEL: Type.Enum(LogLevel),
  LOG_FILE: Type.String(),

  HOST: Type.String({default: 'localhost'}),
  PORT: Type.Number({default: 8000}),

  POSTGRES_HOST: Type.String(),
  POSTGRES_PASSWORD: Type.String(),
  POSTGRES_USER: Type.String(),
  POSTGRES_DB: Type.String(),
});

const env = envSchema<Static<typeof schema>>({
  dotenv: true,
  schema,
});

export const config = Object.freeze({
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === NodeEnv.Development,
  isProduction: env.NODE_ENV === NodeEnv.Production,
  log: {
    level: env.LOG_LEVEL,
    file: env.LOG_FILE,
  },
  server: {
    host: env.HOST,
    port: env.PORT,
  },
  db: {
    url: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}/${env.POSTGRES_DB}?sslmode=disable`,
  },
});

export type ConfigType = typeof config;
