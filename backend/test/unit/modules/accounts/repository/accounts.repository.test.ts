import {beforeEach, describe, expect, it} from 'vitest';
import {useTestDb} from '../../../use-test-db.js';
import AccountsRepository from '@src/modules/accounts/repository/accounts.repository.js';
import {ACCOUNTS_TABLE} from '@shared/live-video-sync-db/live-video-sync-db.schema.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import fakeDrizzelError from '../../../fake-drizzle-error.js';
import type {LiveVideoSyncDB} from '@shared/live-video-sync-db/live-video-sync-db.js';

interface LocalTestContext {
  accountsRepository: AccountsRepository;
}

async function checkAccounts(
  db: LiveVideoSyncDB,
  expected: Array<{userId: number; username: string; passwordHash: string}>,
  message?: string,
) {
  const accounts = await db.select().from(ACCOUNTS_TABLE).orderBy(ACCOUNTS_TABLE.username);
  expect(accounts, message).toEqual(expected);
}

describe('Accounts repository', () => {
  useTestDb();

  const username1 = 'user1';
  const username2 = 'user2';
  const passwordHash1 = 'somehash1';
  const passwordHash2 = 'somehash2';
  let userId1: number;
  let userId2: number;
  let initialAccountsDbState: Array<{userId: number; username: string; passwordHash: string}>;

  beforeEach<LocalTestContext>(async context => {
    context.accountsRepository = new AccountsRepository(context.db);

    userId1 = await context.accountsRepository.createAccount(username1, passwordHash1);
    userId2 = await context.accountsRepository.createAccount(username2, passwordHash2);

    initialAccountsDbState = [
      {userId: userId1, username: username1, passwordHash: passwordHash1},
      {userId: userId2, username: username2, passwordHash: passwordHash2},
    ];
  });

  describe('Creating accounts', async () => {
    it<LocalTestContext>('creates new accounts', async ({db}) => {
      await checkAccounts(db, initialAccountsDbState);
    });

    it<LocalTestContext>('rejects duplicate usernames', async ({db, accountsRepository}) => {
      const createResult = accountsRepository.createAccount(username2, passwordHash2);

      await expect(createResult).rejects.toThrow(APP_ERRORS.DUPLICATE_USERNAME);

      await checkAccounts(db, initialAccountsDbState);
    });

    it<LocalTestContext>('wraps unexpected errors', async () => {
      const accountsRepository = new AccountsRepository(fakeDrizzelError(['insert', 'values', 'returning']));

      const createResult = accountsRepository.createAccount('username', 'hash');

      await expect(createResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
    });
  });

  describe('Getting accounts by user id', () => {
    it<LocalTestContext>('gets valid user accounts', async ({db, accountsRepository}) => {
      const account1 = await accountsRepository.getAccountUserId(userId1);
      const account2 = await accountsRepository.getAccountUserId(userId2);

      expect(account1).toEqual({userId: userId1, username: username1, passwordHash: passwordHash1});
      expect(account2).toEqual({userId: userId2, username: username2, passwordHash: passwordHash2});
      await checkAccounts(db, initialAccountsDbState);
    });

    it<LocalTestContext>('rejects fetching invalid user accounts', async ({db, accountsRepository}) => {
      const getResult = accountsRepository.getAccountUserId(Math.max(userId1, userId2) + 1);

      await expect(getResult).rejects.toThrow(APP_ERRORS.USER_ID_NOT_FOUND);
      await checkAccounts(db, initialAccountsDbState);
    });

    it<LocalTestContext>('wraps unexpected errors', async () => {
      const accountsRepository = new AccountsRepository(
        fakeDrizzelError(['select', 'from', 'where', 'limit'], new Error('something unexpected')),
      );

      const createResult = accountsRepository.getAccountUserId(1);

      await expect(createResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
    });
  });

  describe('Getting accounts by username', () => {
    it<LocalTestContext>('gets valid user accounts', async ({db, accountsRepository}) => {
      const account1 = await accountsRepository.getAccountUsername(username1);
      const account2 = await accountsRepository.getAccountUsername(username2);

      expect(account1).toEqual({userId: userId1, username: username1, passwordHash: passwordHash1});
      expect(account2).toEqual({userId: userId2, username: username2, passwordHash: passwordHash2});
      await checkAccounts(db, initialAccountsDbState);
    });

    it<LocalTestContext>('rejects fetching invalid user accounts', async ({db, accountsRepository}) => {
      const getResult = accountsRepository.getAccountUsername('not a user');

      await expect(getResult).rejects.toThrow(APP_ERRORS.USERNAME_NOT_FOUND);
      await checkAccounts(db, initialAccountsDbState);
    });

    it<LocalTestContext>('wraps unexpected errors', async () => {
      const accountsRepository = new AccountsRepository(fakeDrizzelError(['select', 'from', 'where', 'limit']));

      const createResult = accountsRepository.getAccountUsername('username');

      await expect(createResult).rejects.toThrowError(APP_ERRORS.UNEXPECTED_DATABASE_ERROR);
    });
  });
});
