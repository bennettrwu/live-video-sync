import {NODE_ENV} from '@config/config-schema.js';
import loadConfig from '@config/load-config.js';
import formatTestNames from '@test/utils/format-test-names.js';
import path from 'path';
import {fileURLToPath} from 'url';
import {beforeEach, describe, expect} from 'vitest';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

describe('Load config', it => {
  const makeEnvPath = (file: string) => path.join(DIRNAME, 'test-config-files', file);

  beforeEach(() => {
    process.env = {};
  });

  it.for(
    formatTestNames([
      {
        name: 'valid0.env',
        envPath: makeEnvPath('valid0.env'),
        expected: {
          nodeEnv: NODE_ENV.TEST,
          isDevelopment: false,
          isProduction: false,
          log: {level: 'debug'},
          server: {
            host: 'localhost',
            port: 8000,
            requestTimeout: 5000,
            connectionTimeout: 5000,
            loginSessionTTL: 86400000,
            cookieSigningKey: '12345678123456781234567812345678',
          },
          db: {
            url: 'postgres://liveVideoSyncBackend:CHANGEME@localhost:5432/liveVideoSyncDB?sslmode=disable',
          },
        },
      },
      {
        name: 'valid1.env',
        envPath: makeEnvPath('valid1.env'),
        expected: {
          nodeEnv: NODE_ENV.DEVELOPMENT,
          isDevelopment: true,
          isProduction: false,
          log: {level: 'silent'},
          server: {
            host: 'localhost',
            port: 8000,
            requestTimeout: 5000,
            connectionTimeout: 5000,
            loginSessionTTL: 3600000,
            cookieSigningKey: '87654321876543218765432187654321',
          },
          db: {
            url: 'postgres://user:password@postgres:2345/database?sslmode=disable',
          },
        },
      },
      {
        name: 'valid2.env',
        envPath: makeEnvPath('valid2.env'),
        expected: {
          nodeEnv: NODE_ENV.PRODUCTION,
          isDevelopment: false,
          isProduction: true,
          log: {level: 'error'},
          server: {
            host: 'bwu.dev',
            port: 443,
            requestTimeout: 10000,
            connectionTimeout: 15000,
            loginSessionTTL: 604800000,
            cookieSigningKey: 'superdupersecretprivatekeyforcookies',
          },
          db: {
            url: 'postgres://liveVideoSyncBackend:supersecretpostgrespassword@postgres:5432/liveVideoSyncDB?sslmode=disable',
          },
        },
      },
    ]),
  )('loads valid config: %s', ([, {envPath, expected}]) => {
    const config = loadConfig(envPath);

    expect(config).toEqual(expected);
  });

  it.for(['invalid0.env', 'invalid1.env', 'invalid2.env', 'invalid3.env'])('rejects invalid config: %s', envFile => {
    const envPath = makeEnvPath(envFile);

    expect(() => loadConfig(envPath)).toThrow();
  });
});
