export {
  type BaseFastifyInstance,
  type BaseServerOptions,
  createBaseServer,
} from './create-base-server.js';
export { createLogger } from './create-logger.js';
export {
  type Registrations,
  createDependencyContainer,
  getDependencyContainer,
  registerDependencies,
  registerDependencyInjection,
} from './dependency-injection.js';
export { type ErrorReply, HttpError } from './errors/http-errors.js';
export { type RawSocket, TypedSocket } from './websocket/typed-socket.js';
export { registerWebSocketPlugin } from './websocket/websocket-plugin.js';
export {
  type WebSocketRouteOptions,
  registerWebSocketRoute,
} from './websocket/websocket-route.js';
