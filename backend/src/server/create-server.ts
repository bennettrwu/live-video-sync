import path from 'path';
import {fileURLToPath} from 'url';
import Fastify from 'fastify';
import fastifyAutoload from '@fastify/autoload';
import {fastifyAwilixPlugin} from '@fastify/awilix';
import {AwilixContainer} from 'awilix';

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
  });

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
    matchFilter: path => ['.route.js', '.route.ts'].some(e => path.endsWith(e)),
  });

  return fastify;
}
