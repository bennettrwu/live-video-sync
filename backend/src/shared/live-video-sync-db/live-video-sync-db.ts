import {drizzle, NodePgDatabase} from 'drizzle-orm/node-postgres';

export type LiveVideoSyncDB = NodePgDatabase<Record<string, never>>;

/**
 * Creates drizzle connection to liveVideoSyncDB using app configuration
 * @param config dependency injected configuration object
 * @returns drizzle orm connection
 */
export default function liveVideoSyncDb(config: Dependencies['config']): LiveVideoSyncDB {
  const db = drizzle(config.db.url);
  return db;
}
