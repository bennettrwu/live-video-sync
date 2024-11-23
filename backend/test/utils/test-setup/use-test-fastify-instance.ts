import {asValue, createContainer, type AwilixContainer} from 'awilix';
import {beforeEach, vi, type Mock, type Mocked, type TestContext} from 'vitest';
import Fastify, {type FastifyInstance} from 'fastify';
import {fastifyAwilixPlugin} from '@fastify/awilix';
import {TypeBoxValidatorCompiler} from '@fastify/type-provider-typebox';
import fastifyCookie from '@fastify/cookie';
import type {ConfigType} from '@config/config.js';
import fakeConfig from '../fakes/fake-config.js';
import {SetErrorFunction} from '@sinclair/typebox/errors';
import type {RecursivePartial} from '@shared/types/recursive-partial.js';
import type {Writeable} from '@shared/types/writeable.js';
import type {Logger} from '@shared/logger/logger.js';
import fakeLogger from '../fakes/fake-logger.js';

export interface FastifyTestContext extends TestContext {
  container: AwilixContainer<Mocked<Dependencies>>;
  fastify: FastifyInstance;
  config: Writeable<ConfigType>;
  defaultReqId: 'test-request-id';
  loggerMock: Mocked<Logger>;
  genReqIdMock: Mock;
  typeValidatorErrorHandlerMock: Mock;
  getSessionTokenMock: Mock;
  errorHandlerMock: Mock;
  routeHandlerMock: Mock;
}
export interface FastifyAuthedTestContext extends FastifyTestContext {
  authenticationMock: Mock;
  getUserIdMock: Mock;
}

function createTestFastifyInstanceWithConfig(customConfig?: RecursivePartial<ConfigType>) {
  return (context: FastifyTestContext) => {
    context.defaultReqId = 'test-request-id';

    context.loggerMock = fakeLogger();
    context.genReqIdMock = vi.fn().mockImplementation(() => context.defaultReqId);
    context.typeValidatorErrorHandlerMock = vi.fn().mockImplementation(e => {
      throw e;
    });
    context.errorHandlerMock = vi.fn().mockImplementation((err, req, res) => res.send({err: err.name}));
    context.routeHandlerMock = vi.fn().mockImplementation((req, res) => res.send());

    context.config = fakeConfig(customConfig);

    context.container = createContainer();
    context.container.register({
      config: asValue(context.config),
    });

    context.fastify = Fastify({
      loggerInstance: context.loggerMock,
      requestTimeout: context.config.server.connectionTimeout,
      connectionTimeout: context.config.server.connectionTimeout,
      disableRequestLogging: true,
    }) as unknown as FastifyInstance;

    context.fastify.setGenReqId(context.genReqIdMock);

    SetErrorFunction(context.typeValidatorErrorHandlerMock);
    context.fastify.setValidatorCompiler(TypeBoxValidatorCompiler);

    context.fastify.register(fastifyCookie, {secret: context.config.server.cookieSigningKey});

    context.fastify.register(fastifyAwilixPlugin, {container: context.container});
    context.fastify.setErrorHandler(context.errorHandlerMock);
  };
}
export function useTestFastifyInstance(customConfig?: RecursivePartial<ConfigType>) {
  beforeEach<FastifyTestContext>(createTestFastifyInstanceWithConfig(customConfig));
}

export function useTestFastifyInstanceWithAuth(customConfig?: RecursivePartial<ConfigType>) {
  useTestFastifyInstance(customConfig);

  beforeEach<FastifyAuthedTestContext>(context => {
    context.authenticationMock = vi.fn().mockResolvedValue(undefined);
    context.getUserIdMock = vi.fn();
    context.getSessionTokenMock = vi.fn();

    context.fastify.decorate('authenticate', context.authenticationMock);
    context.fastify.decorateRequest('getUserId', context.getUserIdMock);
    context.fastify.decorateRequest('getSessionToken', context.getSessionTokenMock);
  });
}
