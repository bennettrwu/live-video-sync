import path from 'path';
import {fileURLToPath} from 'url';
import Fastify from 'fastify';
import fastifyAutoload from '@fastify/autoload';
import {fastifyAwilixPlugin} from '@fastify/awilix';
import {TypeBoxTypeProvider, TypeBoxValidatorCompiler} from '@fastify/type-provider-typebox';
import {AwilixContainer} from 'awilix';
import {v4 as uuidv4} from 'uuid';

import errorHandler from './error-handler.js';
import notFoundHandler from './not-found-handler.js';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

// Ensure fastify awilix container is typed with all dependency types
declare module '@fastify/awilix' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Cradle extends Dependencies {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RequestCradle extends Dependencies {}
}

/**
 * Creates fastify server and loads all plugins, hooks, and modules from corresponding folders
 * @param dependencyContainer
 * @returns
 */
export default function createServer(dependencyContainer: AwilixContainer<Dependencies>) {
  const logger = dependencyContainer.resolve('logger');
  const config = dependencyContainer.resolve('config');

  const fastify = Fastify({
    loggerInstance: logger,
    connectionTimeout: config.server.connectionTimeout,
    requestTimeout: config.server.requestTimeout,
    disableRequestLogging: true,
  })
    .setValidatorCompiler(TypeBoxValidatorCompiler)
    .withTypeProvider<TypeBoxTypeProvider>()
    .setErrorHandler(errorHandler)
    .setNotFoundHandler(notFoundHandler)
    .setGenReqId(
      req => (req.headers['request-id'] || req.headers['x-request-id'] || uuidv4()) as string,
    );

  // Register dependency injection container
  fastify.register(fastifyAwilixPlugin, {
    container: dependencyContainer,
    disposeOnClose: true,
    disposeOnResponse: true,
    strictBooleanEnforced: true,
  });

  // Autoload plugins and hooks
  fastify.register(fastifyAutoload, {dir: path.join(DIRNAME, 'plugins')});
  fastify.register(fastifyAutoload, {dir: path.join(DIRNAME, 'hooks')});

  // Register all *.route.js files in modules folder
  fastify.register(fastifyAutoload, {
    dir: path.join(DIRNAME, '../modules'),
    dirNameRoutePrefix: false,
    matchFilter: path => ['.route.js'].some(e => path.endsWith(e)),
  });

  return fastify;
}
