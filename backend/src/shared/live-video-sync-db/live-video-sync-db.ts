import {drizzle, NodePgClient, NodePgDatabase} from 'drizzle-orm/node-postgres';

export type LiveVideoSyncDB = NodePgDatabase<Record<string, never>> & {
  $client: NodePgClient;
};

export default function liveVideoSyncDB({config}: Dependencies): LiveVideoSyncDB {
  const db = drizzle(config.db.url);
  return db;
}
