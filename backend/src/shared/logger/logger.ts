import pino from 'pino';

export type Logger = pino.Logger;

export default function logger({config}: Dependencies): Logger {
  let transports = pino.transport({
    level: config.log.level,
    target: 'pino/file',
    options: {
      destination: config.log.file,
    },
  });
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

  const logger = pino({level: config.log.level}, transports);

  logger.info(`Log level set to: ${config.log.level}`);
  logger.info(`Log file saved to: ${config.log.file}`);

  return logger;
}
