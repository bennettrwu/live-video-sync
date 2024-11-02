import pino from 'pino';

export type Logger = pino.Logger;

/**
 * createLogger()
 * @param log_level the level of logs to keep (debug, info, warn, error...)
 * @param log_destination file path for where to save logs
 * @returns logger
 */
export default function createLogger(
  log_level?: string,
  log_destination?: string
): Logger {
  const transports = pino.transport({
    targets: [
      {
        level: log_level,
        target: 'pino/file',
        options: {
          destination: log_destination,
        },
      },
      {
        level: process.env.LOG_LEVEL,
        target: 'pino-pretty',
        options: {colorize: true},
      },
    ],
  });

  const logger = pino({level: process.env.LOG_LEVEL}, transports);

  logger.info(`Log level set to: ${logger.level}`);
  logger.info(`Log file saved to: ${process.env.LOG_DEST}`);

  return logger;
}
