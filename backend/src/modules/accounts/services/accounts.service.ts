import {APP_ERRORS} from '@shared/errors/app-errors.js';

declare global {
  interface Dependencies {
    accountsService: AccountsService;
  }
}

export default class AccountsService {
  constructor(
    private accountsRepository: Dependencies['accountsRepository'],
    private hashingService: Dependencies['hashingService'],
  ) {}

  /**
   * Checks if a given username is valid to use
   * INVALID_USERNAME error will contain reason for rejection
   * @throws {APP_ERRORS.INVALID_USERNAME}
   * @param username
   */
  isValidUsername(username: string) {
    if (username.length > 16 || username.length < 1) {
      throw new APP_ERRORS.INVALID_USERNAME('Username must be between 1 and 16 characters long.');
    }
    if (!/^[\x20-\xFF]*$/.test(username)) {
      throw new APP_ERRORS.INVALID_USERNAME('Username can only contain ASCII characters.');
    }
    if (/\s/u.test(username)) throw new APP_ERRORS.INVALID_USERNAME('Username cannot contain spaces.');
  }

  /**
   * Creates a new user account with given credentials
   * @throws {APP_ERRORS.PASSWORD_HASH_ERROR}
   * @throws {APP_ERRORS.DUPLICATE_USERNAME}
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param username
   * @param password
   * @returns user id, username, and password hash of created account
   */
  async createNewAccount(username: string, password: string) {
    const passwordHash = await this.hashingService.hashPassword(password);
    const userId = await this.accountsRepository.createAccount(username, passwordHash);

    return {userId, username, passwordHash};
  }

  /**
   * Validates if account credentials are correct, throws error if not
   * @throws {APP_ERRORS.USERNAME_NOT_FOUND}
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @throws {APP_ERRORS.PASSWORD_VERIFY_ERROR}
   * @throws {APP_ERRORS.INVALID_ACCOUNT_CREDENTIALS}
   * @param username
   * @param password
   * @returns
   */
  async validateAccountCredentials(username: string, password: string) {
    const {userId, passwordHash} = await this.accountsRepository.getAccountUsername(username);
    const valid = await this.hashingService.verifyPassword(password, passwordHash);

    if (!valid) throw new APP_ERRORS.INVALID_ACCOUNT_CREDENTIALS();
    return userId;
  }
}
