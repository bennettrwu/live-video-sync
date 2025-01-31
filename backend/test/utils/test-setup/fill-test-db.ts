import {ACCOUNTS_TABLE} from '@shared/live-video-sync-db/live-video-sync-db.schema.js';
import type {DbTestContext} from './use-test-db.js';

export interface FilledDbTestContext extends DbTestContext {
  users: Array<{userId: number; username: string; passwordHash: string}>;
  userPasswords: Array<string>;
}

export async function fillTestDb(context: FilledDbTestContext) {
  const db = context.db;

  const users = [
    {username: 'user1', passwordHash: '$argon2id$v=19$m=16,t=2,p=1$a25QanFtdzNCNUdHelZTdw$Z9ruReMVmyrraZ0pWS+P6Q'},
    {username: 'user2', passwordHash: '$argon2id$v=19$m=16,t=2,p=1$RUpBeW43Nkl2aFJ6aWJMcA$p/7N85VzGcPLKlYqNk/sLw'},
    {username: 'user3', passwordHash: '$argon2id$v=19$m=40,t=2,p=5$MUxEeTQ5NVhRR24wVEdFZA$/8zP/Hq9A13hBYUCVyKxQA'},
  ];
  context.userPasswords = ['password', 'some other different password', '⡃⠗ⱦ⯏℈⎓●⌆Ⓚ⡛ℿ'];

  await db.insert(ACCOUNTS_TABLE).values(users);
  context.users = await db.select().from(ACCOUNTS_TABLE).orderBy(ACCOUNTS_TABLE.userId);
}
