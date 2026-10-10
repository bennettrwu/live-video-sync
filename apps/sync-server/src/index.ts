import { loadAppConfig } from './app-config.js';
import { buildServer } from './build-server.js';

const config = loadAppConfig();
const app = await buildServer(config);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.fatal(error);
  process.exit(1);
}
