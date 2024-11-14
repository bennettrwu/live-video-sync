import {beforeEach, describe, expect, it} from 'vitest';
import {ACCOUNTS_TABLE, SESSIONS_TABLE} from '@shared/live-video-sync-db/live-video-sync-db.schema.js';
import SessionRepository from '@shared/repository/session.repository.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import type {LiveVideoSyncDB} from '@shared/live-video-sync-db/live-video-sync-db.js';
import {useTestDb} from '../../use-test-db.js';

interface LocalTestContext {
  userIds: number[];
  sessionRepository: SessionRepository;
}

async function checkSessions(db: LiveVideoSyncDB, expected: Array<{userId: number; token: string; expires: Date}>) {
  const sessions = await db.select().from(SESSIONS_TABLE).orderBy(SESSIONS_TABLE.token);

  expect(sessions.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(sessions[0].token).toBe(expected[0].token);
    expect(sessions[0].userId).toBe(expected[0].userId);
    expect(Math.abs(sessions[0].expires.getTime() - expected[0].expires.getTime())).toBeLessThan(1_000); // up to 1 sec off
  }
}

describe('Session repository', () => {
  useTestDb();

  beforeEach<LocalTestContext>(async context => {
    const db = context.db;

    const result = await db
      .insert(ACCOUNTS_TABLE)
      .values([
        {username: 'testUser1', passwordHash: 'someHash'},
        {username: 'testUser2', passwordHash: 'someHash'},
        {username: 'testUser3', passwordHash: 'someHash'},
        {username: 'testUser4', passwordHash: 'someHash'},
        {username: 'testUser5', passwordHash: 'someHash'},
      ])
      .returning({userId: ACCOUNTS_TABLE.userId});

    context.userIds = result.map(({userId}) => userId);
    context.sessionRepository = new SessionRepository(db);
  });

  describe('Creating sessions', () => {
    it<LocalTestContext>('creates session for existing user', async ({db, userIds, sessionRepository}) => {
      const futureDate = new Date(Date.now() + 60_000);
      const token1 = 'sessionToken1';
      const token2 = 'sessionToken2';

      await sessionRepository.saveSessionToken(userIds[0], token1, futureDate);
      await sessionRepository.saveSessionToken(userIds[1], token2, futureDate);

      await checkSessions(db, [
        {userId: userIds[0], token: token1, expires: futureDate},
        {userId: userIds[1], token: token2, expires: futureDate},
      ]);
    });

    it<LocalTestContext>('rejects sessions for nonexisting user', async ({db, userIds, sessionRepository}) => {
      const futureDate = new Date(Date.now() + 60_000);
      const invalidUserId = Math.max(...userIds) + 1;

      const saveResult = sessionRepository.saveSessionToken(invalidUserId, 'sessionToken', futureDate);

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.USER_ID_NOT_FOUND);
      await checkSessions(db, []);
    });

    it<LocalTestContext>('rejects duplicate session keys', async ({db, userIds, sessionRepository}) => {
      const futureDate = new Date(Date.now() + 60_000);
      const token = 'sessionToken';

      await sessionRepository.saveSessionToken(userIds[0], token, futureDate);
      const saveResult = sessionRepository.saveSessionToken(userIds[1], token, futureDate);

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.DUPLICATE_SESSION_TOKEN);
      await checkSessions(db, [{userId: userIds[0], token, expires: futureDate}]);
    });

    it<LocalTestContext>('wraps unexpected errors', async ({userIds}) => {
      const sessionRepository = new SessionRepository({
        insert: () => {
          return {
            values: () => {
              return new Promise((resolve, reject) => reject(new Error('Something unexpected')));
            },
          };
        },
      } as unknown as LiveVideoSyncDB);

      const futureDate = new Date(Date.now() + 60_000);
      const token = 'sessionToken';

      const saveResult = sessionRepository.saveSessionToken(userIds[0], token, futureDate);

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
    });
  });

  describe('Getting valid sessions', () => {
    it<LocalTestContext>('gets valid sessions', async ({userIds, sessionRepository}) => {
      const futureDate = new Date(Date.now() + 60_000);
      const token1 = 'sessionToken1';
      const token2 = 'sessionToken2';

      await sessionRepository.saveSessionToken(userIds[0], token1, futureDate);
      await sessionRepository.saveSessionToken(userIds[1], token2, futureDate);

      const userId1 = await sessionRepository.getValidSession(token1);
      const userId2 = await sessionRepository.getValidSession(token2);

      expect(userId1).toBe(userIds[0]);
      expect(userId2).toBe(userIds[1]);
    });

    it<LocalTestContext>('does not get invalid sessions', async ({userIds, sessionRepository}) => {
      const futureDate = new Date(Date.now() - 60_000);
      const token = 'sessionToken';

      await sessionRepository.saveSessionToken(userIds[0], token, futureDate);

      const getResult = sessionRepository.getValidSession(token);

      await expect(getResult).rejects.toThrowError(APP_ERRORS.VALID_SESSION_NOT_FOUND);
    });

    it<LocalTestContext>('wraps unexpected errors', async () => {
      const sessionRepository = new SessionRepository({
        select: () => {
          return {
            from: () => {
              return {
                where: () => {
                  return new Promise((resolve, reject) => reject(new Error('Something unexpected')));
                },
              };
            },
          };
        },
      } as unknown as LiveVideoSyncDB);

      const saveResult = sessionRepository.getValidSession('sessionToken');

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
    });
  });

  describe('Updating sessions', () => {
    it<LocalTestContext>('updates the expiration of sessions', async ({db, userIds, sessionRepository}) => {
      const futureDate = new Date(Date.now() + 60_000);
      const futureFutureDate = new Date(Date.now() + 120_000);
      const token1 = 'sessionToken1';
      const token2 = 'sessionToken2';

      await sessionRepository.saveSessionToken(userIds[0], token1, futureDate);
      await sessionRepository.saveSessionToken(userIds[1], token2, futureDate);

      await sessionRepository.updateSessionExpiry(token1, futureFutureDate);

      await checkSessions(db, [
        {userId: userIds[0], token: token1, expires: futureFutureDate},
        {userId: userIds[1], token: token2, expires: futureDate},
      ]);
    });

    it<LocalTestContext>('wraps unexpected errors', async () => {
      const sessionRepository = new SessionRepository({
        update: () => {
          return {
            set: () => {
              return {
                where: () => {
                  return new Promise((resolve, reject) => reject(new Error('Something unexpected')));
                },
              };
            },
          };
        },
      } as unknown as LiveVideoSyncDB);

      const saveResult = sessionRepository.updateSessionExpiry('sessionToken', new Date());

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
    });
  });

  describe('Deleting sessions', () => {
    it<LocalTestContext>('deletes sessions', async ({db, userIds, sessionRepository}) => {
      const futureDate = new Date(Date.now() + 60_000);
      const token1 = 'sessionToken1';
      const token2 = 'sessionToken2';

      await sessionRepository.saveSessionToken(userIds[0], token1, futureDate);
      await sessionRepository.saveSessionToken(userIds[1], token2, futureDate);

      await sessionRepository.deleteSession(token1);

      await checkSessions(db, [{userId: userIds[1], token: token2, expires: futureDate}]);
    });

    it<LocalTestContext>('wraps unexpected errors', async () => {
      const sessionRepository = new SessionRepository({
        delete: () => {
          return {
            where: () => {
              return new Promise((resolve, reject) => reject(new Error('Something unexpected')));
            },
          };
        },
      } as unknown as LiveVideoSyncDB);

      const saveResult = sessionRepository.deleteSession('sessionToken');

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
    });
  });
});
