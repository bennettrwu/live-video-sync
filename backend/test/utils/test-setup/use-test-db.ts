import path from 'path';
import {fileURLToPath} from 'url';
import type {LiveVideoSyncDB} from '@shared/live-video-sync-db/live-video-sync-db.js';
import {PostgreSqlContainer} from '@testcontainers/postgresql';
import {drizzle} from 'drizzle-orm/node-postgres';
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import {beforeAll, beforeEach, afterEach, type TestContext} from 'vitest';
import {
  ACCOUNTS_TABLE,
  MEDIA_TABLE,
  ROOM_USERS,
  ROOMS_TABLE,
  SESSIONS_TABLE,
  UPLOAD_STATUS_TABLE,
} from '@shared/live-video-sync-db/live-video-sync-db.schema.js';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

export interface DbTestContext extends TestContext {
  db: LiveVideoSyncDB;
  connectionString: string;
}

export function useTestDb() {
  let db: LiveVideoSyncDB;
  let connectionString: string;

  beforeAll(async () => {
    const postgresContainer = await new PostgreSqlContainer('postgres:17.0').start();

    connectionString = postgresContainer.getConnectionUri();
    db = drizzle(connectionString);

    await migrate(db, {migrationsFolder: path.join(DIRNAME, '../../../drizzle')});
  }, 60_000);

  beforeEach<DbTestContext>(context => {
    context.db = db;
    context.connectionString = connectionString;
  });

  afterEach<DbTestContext>(async ({db}) => {
    await db.delete(ACCOUNTS_TABLE);
    await db.delete(SESSIONS_TABLE);
    await db.delete(ROOMS_TABLE);
    await db.delete(ROOM_USERS);
    await db.delete(UPLOAD_STATUS_TABLE);
    await db.delete(MEDIA_TABLE);
  });
}
