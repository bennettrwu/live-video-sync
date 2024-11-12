import {pino} from 'pino';

export type Logger = pino.Logger;

/**
 * Creates a logger instance using app configuration
 * @param config dependency injected configuration object
 * @returns created logger
 */
export default function logger(config: Dependencies['config']): Logger {
  let transports = pino.transport({
    level: config.log.level,
    target: 'pino/file',
    options: {
      destination: config.log.file,
    },
  });

  // Also print to console if in development
  if (config.isDevelopment) {
    transports = pino.transport({
      targets: [
        {
          level: config.log.level,
          target: 'pino/file',
          options: {
            destination: config.log.file,
          },
        },
        {
          level: process.env.LOG_LEVEL,
          target: 'pino-pretty',
          options: {colorize: true},
        },
      ],
    });
  }

  const logger = pino({level: config.log.level, serializers: {err: pino.stdSerializers.errWithCause}}, transports);

  logger.info(`Log level set to: ${config.log.level}`);
  logger.info(`Log file saved to: ${config.log.file}`);

  return logger;
}
