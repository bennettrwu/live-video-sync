import dotenv from 'dotenv';
import createLogger from './logger';
import Fastify from 'fastify';
import FastifyWebsocket from '@fastify/websocket';
import {v4 as uuidv4} from 'uuid';
import websocketHandler from './roomSyncAPIv1';

// Grab configuration from .env file
dotenv.config();

const log = createLogger(process.env.LOG_LEVEL, process.env.LOG_DEST);

// Setup fastify server
const fastify = Fastify({loggerInstance: log, genReqId: () => uuidv4()});
fastify.register(FastifyWebsocket);
fastify.register(websocketHandler);
fastify.listen(
  {port: process.env.PORT ? parseInt(process.env.PORT) : 8080},
  err => {
    if (err) {
      fastify.log.fatal(err);
      throw err;
    }
  }
);
