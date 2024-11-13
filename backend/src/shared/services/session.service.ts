import crypto from 'crypto';
import {errorTuplePromise as etp} from '../utils/errorTuple.js';
import {APP_ERRORS} from '../errors/app-errors.js';

declare global {
  export interface Dependencies {
    sessionService: SessionService;
  }
}

export default class SessionService {
  constructor(
    private config: Dependencies['config'],
    private sessionRepository: Dependencies['sessionRepository'],
  ) {}

  /**
   * Creates a new session for a given user
   * @throws {APP_ERRORS.USER_ID_NOT_FOUND}
   * @throws {APP_ERRORS.DUPLICATE_SESSION_TOKEN}
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param userId
   * @returns session token of created session
   */
  async createNewSession(userId: number) {
    const expires = new Date(Date.now() + this.config.server.loginSessionTTL);

    // Retry insertion in case of conflicts with randomly generated session tokens
    for (let i = 0; i < 10; i++) {
      const token = crypto.randomBytes(32).toString('hex');
      const [, saveErr] = await etp(this.sessionRepository.saveSessionToken(userId, token, expires));

      if (!saveErr) return {token, expires};
      // If error is not due to duplicate session token, throw error, otherwise retry
      if (!(saveErr instanceof APP_ERRORS.DUPLICATE_SESSION_TOKEN)) throw saveErr;
    }

    throw new APP_ERRORS.DUPLICATE_SESSION_TOKEN();
  }

  /**
   * Gets the user id corresponding to given session token and refreshes the expiration of the session
   * @throws {APP_ERRORS.VALID_SESSION_NOT_FOUND}
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param sessionToken
   * @returns user id and new expiration date
   */
  async getAndRefreshSession(sessionToken: string) {
    const newExpiry = new Date(Date.now() + this.config.server.loginSessionTTL);

    const userId = await this.sessionRepository.getValidSession(sessionToken);

    // getValidSession throws error if session is not found, so update is skipped
    await this.sessionRepository.updateSessionExpiry(sessionToken, newExpiry);

    return {userId, newExpiry};
  }

  /**
   * Invalidates a given session token
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param sessionToken
   */
  async invalidateUserSession(sessionToken: string) {
    await this.sessionRepository.deleteSession(sessionToken);
  }
}
