import type {Static} from '@sinclair/typebox';
import {NODE_ENV, SCHEMA, type ConfigType} from './config-schema.js';
import envSchema from 'env-schema';

export default function loadConfig(path?: string) {
  const env = envSchema<Static<typeof SCHEMA>>({
    dotenv: {path},
    schema: SCHEMA,
  });

  // Application configuration object
  const config: ConfigType = Object.freeze({
    nodeEnv: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === NODE_ENV.DEVELOPMENT,
    isProduction: env.NODE_ENV === NODE_ENV.PRODUCTION,
    log: {
      level: env.LOG_LEVEL,
    },
    server: {
      host: env.HOST,
      port: env.PORT,
      requestTimeout: env.GLOBAL_REQUEST_TIMEOUT,
      connectionTimeout: env.GLOBAL_CONNECTION_TIMEOUT,
      loginSessionTTL: env.LOGIN_SESSION_TTL,
      cookieSigningKey: env.COOKIE_SIGNING_KEY,
    },
    db: {
      url: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}/${env.POSTGRES_DB}?sslmode=disable`,
    },
  });

  return config;
}
