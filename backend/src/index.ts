import createDependencyContainer from './dependency-injection/create-dependency-container';
import createServer from './server/create-server';

async function init() {
  const dependencyContainer = createDependencyContainer();

  const logger = dependencyContainer.resolve('logger');
  const config = dependencyContainer.resolve('config');

  const fastify = createServer(dependencyContainer);

  try {
    await fastify.listen({port: config.server.port, host: config.server.host});
  } catch (err) {
    logger.fatal({msg: 'Failed to start fastify webserver', err});
    throw err; // terminate if fails to start
  }
}

init();
