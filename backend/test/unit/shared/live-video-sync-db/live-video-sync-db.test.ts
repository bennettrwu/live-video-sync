import {describe, expect} from 'vitest';
import {ACCOUNTS_TABLE} from '@shared/live-video-sync-db/live-video-sync-db.schema.js';
import {useTestDb, type DbTestContext} from '@test/unit/test-utils/use-test-db.js';
import liveVideoSyncDb from '@shared/live-video-sync-db/live-video-sync-db.js';
import type {ConfigType} from '@config/config.js';

describe<DbTestContext>('Live video sync db', it => {
  useTestDb();

  it('connects to given database', async ({db, connectionString}) => {
    await db.insert(ACCOUNTS_TABLE).values({username: 'test1', passwordHash: 'hash'});

    const dbConnection = liveVideoSyncDb({db: {url: connectionString}} as ConfigType);
    await db.insert(ACCOUNTS_TABLE).values({username: 'test0', passwordHash: 'hash'});

    const testResult = await dbConnection.select().from(ACCOUNTS_TABLE).orderBy(ACCOUNTS_TABLE.userId);
    const expectResult = await db.select().from(ACCOUNTS_TABLE).orderBy(ACCOUNTS_TABLE.userId);
    expect(testResult).toEqual(expectResult);
  });
});
