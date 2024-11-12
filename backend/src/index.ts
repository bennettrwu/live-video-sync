import createDependencyContainer from './dependency-injection/create-dependency-container.js';
import createServer from './server/create-server.js';
import {APP_ERRORS} from './shared/errors/app-errors.js';

async function init() {
  const dependencyContainer = await createDependencyContainer();

  const logger = dependencyContainer.resolve('logger');
  const config = dependencyContainer.resolve('config');

  const fastify = createServer(dependencyContainer);

  process.on('uncaughtException', err => {
    logger.fatal({msg: 'Uncaught exception', err});
    throw err; // terminate on uncaught errors
  });

  process.on('unhandledRejection', reason => {
    const err = new APP_ERRORS.UNHANDLED_REJECTION().causedBy(reason);
    logger.fatal({msg: 'Unhandled rejection', err});
    throw err; // terminate on uncaught rejection
  });

  try {
    await fastify.listen({port: config.server.port, host: config.server.host});
  } catch (err) {
    logger.fatal({msg: 'Failed to start fastify webserver', err});
    throw err; // terminate if fails to start
  }
}

await init();
