import {asValue, createContainer, type AwilixContainer} from 'awilix';
import fakeConfig from './fake-config.js';
import fakeLogger from './fake-logger.js';
import createServer from '@server/create-server.js';
import {vi, type Mock, type Mocked} from 'vitest';
import type {AppFastifyInstance} from '@shared/types/fastify.js';
import type {ConfigType} from '@src/config/config.js';
import type {Logger} from '@shared/logger/logger.js';
import fastifyPlugin from 'fastify-plugin';

export interface FastifyTestContext {
  logger: Mocked<Logger>;
  config: Mocked<ConfigType>;
  container: AwilixContainer<Mocked<Dependencies>>;
  fastify: AppFastifyInstance;
  authenticationMock: Mock;
  getUserIdMock: Mock;
  getSessionTokenMock: Mock;
}

const AUTH_MOCK = vi.fn().mockResolvedValue(undefined);
const GET_UID_MOCK = vi.fn();
const GET_TOKEN_MOCK = vi.fn();
vi.mock('@server/plugins/session-authentication.js', async () => {
  return {
    autoConfig: false,
    autoload: true,
    autoPrefix: true,
    prefixOverride: false,
    default: fastifyPlugin(fastify => {
      fastify.decorateRequest('getUserId', GET_UID_MOCK);
      fastify.decorateRequest('getSessionToken', GET_TOKEN_MOCK);
      fastify.decorate('authenticate', AUTH_MOCK);
    }),
  };
});

export default function useTestFastifyInstance(context: FastifyTestContext) {
  AUTH_MOCK.mockReset().mockResolvedValue(undefined);
  GET_UID_MOCK.mockReset();
  GET_TOKEN_MOCK.mockReset();
  context.authenticationMock = AUTH_MOCK;
  context.getUserIdMock = GET_UID_MOCK;
  context.getSessionTokenMock = GET_TOKEN_MOCK;

  context.logger = fakeLogger();
  context.config = fakeConfig({server: {cookieSigningKey: 'cookieSecret'}});
  context.container = createContainer();
  context.container.register({
    logger: asValue(context.logger),
    config: asValue(context.config),
  });

  context.fastify = createServer(context.container);
}
