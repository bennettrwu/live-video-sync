import { type Logger, pino } from 'pino';

/**
 * Creates the pino logger a server runs on.
 * @param level pino level name, e.g. `info` or `silent`
 */
export function createLogger(level: string): Logger {
  return pino({ level });
}
