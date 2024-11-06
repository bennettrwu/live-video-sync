import fastifyAutoload from '@fastify/autoload';
import {fastifyAwilixPlugin} from '@fastify/awilix';
import {TypeBoxTypeProvider} from '@fastify/type-provider-typebox';
import {AwilixContainer} from 'awilix';
import Fastify from 'fastify';
import path from 'path';

declare module '@fastify/awilix' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Cradle extends Dependencies {}
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface RequestCradle extends Dependencies {}
}

export default function createServer(dependencyContainer: AwilixContainer<Dependencies>) {
  const logger = dependencyContainer.resolve('logger');

  const fastify = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  fastify.register(fastifyAwilixPlugin, {
    container: dependencyContainer,
    disposeOnClose: true,
    disposeOnResponse: true,
    strictBooleanEnforced: true,
  });

  fastify.register(fastifyAutoload, {
    dir: path.join(__dirname, 'plugins'),
  });

  fastify.register(fastifyAutoload, {
    dir: path.join(__dirname, 'hooks'),
  });

  fastify.register(fastifyAutoload, {
    dir: path.join(__dirname, '../modules'),
    dirNameRoutePrefix: false,
    matchFilter: path => ['.route.js'].some(e => path.endsWith(e)),
  });

  fastify.get('/health', (req, res) => {
    return res.code(200).send({statue: 'ok'});
  });

  return fastify;
}
