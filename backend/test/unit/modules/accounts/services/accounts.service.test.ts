import AccountsRepository from '@src/modules/accounts/repository/accounts.repository.js';
import {beforeEach, describe, expect, it, type Mocked} from 'vitest';
import AccountsService from '@src/modules/accounts/services/accounts.service.js';
import HashingService from '@shared/services/hashing.service.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import fakeClass from '@test/unit/utils/fake-class.js';

interface LocalTestContext {
  accountsRepository: Mocked<AccountsRepository>;
  hashingService: Mocked<HashingService>;
  accountsService: AccountsService;
}

describe('Accounts service', () => {
  const userId = 1;
  const username = 'username';
  const password = 'password';
  const passwordHash = 'passwordHash';
  const error1 = new Error('some error');
  const error2 = new Error('some other error');

  beforeEach<LocalTestContext>(context => {
    context.accountsRepository = fakeClass(AccountsRepository);
    context.hashingService = fakeClass(HashingService);
    context.accountsService = new AccountsService(context.accountsRepository, context.hashingService);
  });

  describe('Creating accounts', () => {
    it<LocalTestContext>('hashes password and saves account to database', async ({
      accountsRepository,
      hashingService,
      accountsService,
    }) => {
      accountsRepository.createAccount.mockResolvedValueOnce(userId);
      hashingService.hashPassword.mockResolvedValueOnce(passwordHash);

      const createdUserId = await accountsService.createNewAccount(username, password);

      expect(createdUserId).toEqual({userId, username, passwordHash});
      expect(hashingService.hashPassword).toHaveBeenCalledWith(password);
      expect(accountsRepository.createAccount).toHaveBeenCalledWith(username, passwordHash);
    });

    it<LocalTestContext>('bubbles up other errors', async ({hashingService, accountsRepository, accountsService}) => {
      hashingService.hashPassword.mockRejectedValueOnce(error1);
      const createResult1 = accountsService.createNewAccount('username', 'password');

      accountsRepository.createAccount.mockRejectedValueOnce(error2);
      const createResult2 = accountsService.createNewAccount('username', 'password');

      await expect(createResult1).rejects.toThrow(error1);
      await expect(createResult2).rejects.toThrow(error2);
    });
  });

  describe('Validating credentials', () => {
    it<LocalTestContext>('accepts valid account credentials', async ({
      hashingService,
      accountsRepository,
      accountsService,
    }) => {
      hashingService.verifyPassword.mockImplementation(
        async (pass, passHash) => pass === password && passHash === passwordHash,
      );
      accountsRepository.getAccountUsername.mockResolvedValue({userId, username, passwordHash});

      const user = await accountsService.validateAccountCredentials(username, password);

      expect(user).toBe(userId);
    });

    it<LocalTestContext>('rejects invalid account password', async ({
      hashingService,
      accountsRepository,
      accountsService,
    }) => {
      hashingService.verifyPassword.mockImplementation(
        async (pass, passHash) => pass === password && passHash === passwordHash,
      );
      accountsRepository.getAccountUsername.mockResolvedValue({userId, username, passwordHash});

      const validateResult = accountsService.validateAccountCredentials(username, 'wrong password');

      await expect(validateResult).rejects.toThrow(APP_ERRORS.INVALID_ACCOUNT_CREDENTIALS);
    });

    it<LocalTestContext>('rejects invalid account username', async ({accountsRepository, accountsService}) => {
      accountsRepository.getAccountUsername.mockRejectedValue(new APP_ERRORS.USERNAME_NOT_FOUND());

      const validateResult = accountsService.validateAccountCredentials('username', 'wrong password');

      await expect(validateResult).rejects.toThrow(APP_ERRORS.USERNAME_NOT_FOUND);
    });

    it<LocalTestContext>('bubbles up other errors', async ({hashingService, accountsRepository, accountsService}) => {
      accountsRepository.getAccountUsername.mockResolvedValue({userId: 1, username: 'username', passwordHash: 'hash'});

      hashingService.verifyPassword.mockRejectedValueOnce(error1);
      const createResult1 = accountsService.validateAccountCredentials('username', 'password');

      accountsRepository.getAccountUsername.mockRejectedValueOnce(error2);
      const createResult2 = accountsService.validateAccountCredentials('username', 'password');

      await expect(createResult1).rejects.toThrow(error1);
      await expect(createResult2).rejects.toThrow(error2);
    });
  });
});
