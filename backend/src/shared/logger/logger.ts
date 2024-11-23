import {pino} from 'pino';

export type Logger = pino.Logger;

/**
 * Creates a logger instance using app configuration
 * @param config dependency injected configuration object
 * @returns created logger
 */
export default function logger(config: Dependencies['config']): Logger {
  const logger = pino({level: config.log.level, serializers: {err: pino.stdSerializers.errWithCause}});
  return logger;
}
