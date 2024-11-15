import {beforeEach, describe, expect, it} from 'vitest';
import {ACCOUNTS_TABLE, SESSIONS_TABLE} from '@shared/live-video-sync-db/live-video-sync-db.schema.js';
import SessionRepository from '@shared/repository/session.repository.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import type {LiveVideoSyncDB} from '@shared/live-video-sync-db/live-video-sync-db.js';
import {useTestDb} from '@test/unit/utils/use-test-db.js';
import fakeDrizzelError from '@test/unit/utils/fake-drizzle-error.js';

interface LocalTestContext {
  sessionRepository: SessionRepository;
}

async function checkSessions(
  db: LiveVideoSyncDB,
  expected: Array<{userId: number; token: string; expires: Date}>,
  message?: string,
) {
  const sessions = await db.select().from(SESSIONS_TABLE).orderBy(SESSIONS_TABLE.token);

  expect(sessions.length, message).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(sessions[0].token, message).toBe(expected[0].token);
    expect(sessions[0].userId, message).toBe(expected[0].userId);
    expect(Math.abs(sessions[0].expires.getTime() - expected[0].expires.getTime()), message).toBeLessThan(1_000); // allow date to be up to 1 sec off
  }
}

describe('Session repository', () => {
  useTestDb();

  const futureDate = new Date(Date.now() + 60_000);
  const token1 = 'sessionToken1';
  const token2 = 'sessionToken2';
  let userId1: number;
  let userId2: number;
  let initialSessionDbState: Array<{userId: number; token: string; expires: Date}>;

  beforeEach<LocalTestContext>(async context => {
    const db = context.db;
    const result = await db
      .insert(ACCOUNTS_TABLE)
      .values([
        {username: 'testUser1', passwordHash: 'someHash'},
        {username: 'testUser2', passwordHash: 'someHash'},
      ])
      .returning({userId: ACCOUNTS_TABLE.userId});

    userId1 = result[0].userId;
    userId2 = result[1].userId;
    context.sessionRepository = new SessionRepository(db);

    await context.sessionRepository.saveSessionToken(userId1, token1, futureDate);
    await context.sessionRepository.saveSessionToken(userId2, token2, futureDate);
    initialSessionDbState = [
      {userId: userId1, token: token1, expires: futureDate},
      {userId: userId2, token: token2, expires: futureDate},
    ];
  });

  describe('Creating sessions', () => {
    it<LocalTestContext>('creates session for existing user', async ({db}) => {
      await checkSessions(db, initialSessionDbState);
    });

    it<LocalTestContext>('rejects sessions for nonexisting user', async ({db, sessionRepository}) => {
      const invalidUserId = Math.max(userId1, userId2) + 1;

      const saveResult = sessionRepository.saveSessionToken(invalidUserId, 'sessionToken', futureDate);

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.USER_ID_NOT_FOUND);
      await checkSessions(db, initialSessionDbState);
    });

    it<LocalTestContext>('rejects duplicate session keys', async ({db, sessionRepository}) => {
      const saveResult = sessionRepository.saveSessionToken(userId2, token1, futureDate);

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.DUPLICATE_SESSION_TOKEN);
      await checkSessions(db, initialSessionDbState);
    });

    it<LocalTestContext>('wraps unexpected errors', async ({db}) => {
      const sessionRepository = new SessionRepository(fakeDrizzelError(['insert', 'values']));

      const saveResult = sessionRepository.saveSessionToken(userId1, 'sessionToken', futureDate);

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
      await checkSessions(db, initialSessionDbState);
    });
  });

  describe('Getting valid sessions', () => {
    it<LocalTestContext>('gets valid sessions', async ({db, sessionRepository}) => {
      expect(await sessionRepository.getValidSession(token1)).toBe(userId1);
      expect(await sessionRepository.getValidSession(token2)).toBe(userId2);
      await checkSessions(db, initialSessionDbState);
    });

    it<LocalTestContext>('does not get invalid sessions', async ({sessionRepository}) => {
      const pastDate = new Date(Date.now() - 60_000);
      const invalidToken = 'sessionToken';
      await sessionRepository.saveSessionToken(userId1, invalidToken, pastDate);

      const getResult = sessionRepository.getValidSession(invalidToken);
      await expect(getResult).rejects.toThrowError(APP_ERRORS.VALID_SESSION_NOT_FOUND);
    });

    it<LocalTestContext>('wraps unexpected errors', async ({db}) => {
      const sessionRepository = new SessionRepository(fakeDrizzelError(['select', 'from', 'where']));

      const saveResult = sessionRepository.getValidSession(token1);

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
      await checkSessions(db, initialSessionDbState);
    });
  });

  describe('Updating sessions', () => {
    it<LocalTestContext>('updates the expiration of sessions', async ({db, sessionRepository}) => {
      const futureFutureDate = new Date(Date.now() + 120_000);

      await sessionRepository.updateSessionExpiry(token1, futureFutureDate);

      await checkSessions(db, [
        {userId: userId1, token: token1, expires: futureFutureDate},
        {userId: userId2, token: token2, expires: futureDate},
      ]);
    });

    it<LocalTestContext>('wraps unexpected errors', async () => {
      const sessionRepository = new SessionRepository(fakeDrizzelError(['update', 'set', 'where']));

      const saveResult = sessionRepository.updateSessionExpiry(token1, futureDate);

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
    });
  });

  describe('Deleting sessions', () => {
    it<LocalTestContext>('deletes sessions', async ({db, sessionRepository}) => {
      await sessionRepository.deleteSession(token1);

      await checkSessions(db, [{userId: userId2, token: token2, expires: futureDate}]);
    });

    it<LocalTestContext>('wraps unexpected errors', async () => {
      const sessionRepository = new SessionRepository(fakeDrizzelError(['delete', 'where']));

      const saveResult = sessionRepository.deleteSession(token1);

      await expect(saveResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
    });
  });
});
