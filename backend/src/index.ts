import path from 'path';
import {fileURLToPath} from 'url';
import createDependencyContainer from './dependency-injection/create-dependency-container.js';
import createServer from './server/create-server.js';
import {APP_ERRORS} from './shared/errors/app-errors.js';
import loadConfig from '@config/load-config.js';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

async function init() {
  const config = loadConfig();
  const dependencyContainer = await createDependencyContainer(DIRNAME, config);

  const logger = dependencyContainer.resolve('logger');

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
