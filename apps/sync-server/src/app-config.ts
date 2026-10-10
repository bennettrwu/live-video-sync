export interface AppConfig {
  port: number;
  host: string;
  roomsDir: string;
  mediaDir: string;
  logLevel: string;
}

/**
 * Reads configuration from environment variables, falling back to dev
 * defaults.
 */
export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env['PORT'] ?? 8080),
    host: env['HOST'] ?? '127.0.0.1',
    roomsDir: env['ROOMS_DIR'] ?? './rooms',
    mediaDir: env['MEDIA_DIR'] ?? './media',
    logLevel: env['LOG_LEVEL'] ?? 'info',
  };
}
