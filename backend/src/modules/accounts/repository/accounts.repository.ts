import pg from 'pg';
import {ACCOUNTS_TABLE} from '@shared/live-video-sync-db/live-video-sync-db.schema.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import {eq} from 'drizzle-orm';
import {errorTuplePromise as etp} from '@shared/utils/errorTuple.js';

declare global {
  interface Dependencies {
    accountsRepository: AccountsRepository;
  }
}

export default class AccountsRepository {
  constructor(private liveVideoSyncDB: Dependencies['liveVideoSyncDB']) {}

  /**
   * Inserts a new account into the database with given username and password hash
   * @throws {APP_ERRORS.DUPLICATE_USERNAME}
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param username
   * @param passwordHash
   * @returns user id of newly created account
   */
  async createAccount(username: string, passwordHash: string) {
    const [insertRes, insertErr] = await etp(
      this.liveVideoSyncDB
        .insert(ACCOUNTS_TABLE)
        .values({username, passwordHash})
        .returning({userId: ACCOUNTS_TABLE.userId}),
    );

    if (insertErr) {
      if (insertErr instanceof pg.DatabaseError && insertErr.constraint === 'accounts_username_unique') {
        throw new APP_ERRORS.DUPLICATE_USERNAME(username);
      }
      throw new APP_ERRORS.UNEXPECTED_DATABASE_ERROR().causedBy(insertErr);
    }

    return insertRes[0].userId;
  }

  /**
   * Get a user account of a given user id from database
   * @throws {APP_ERRORS.USER_ID_NOT_FOUND}
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param userId
   * @returns user id, username, and password hash of fetched account
   */
  async getAccountUserId(userId: number) {
    const [selectRes, selectErr] = await etp(
      this.liveVideoSyncDB
        .select({
          userId: ACCOUNTS_TABLE.userId,
          username: ACCOUNTS_TABLE.username,
          passwordHash: ACCOUNTS_TABLE.passwordHash,
        })
        .from(ACCOUNTS_TABLE)
        .where(eq(ACCOUNTS_TABLE.userId, userId))
        .limit(1),
    );

    if (selectErr) throw new APP_ERRORS.UNEXPECTED_DATABASE_ERROR().causedBy(selectErr);
    if (selectRes.length === 0) throw new APP_ERRORS.USER_ID_NOT_FOUND(userId);

    return selectRes[0];
  }

  /**
   * Get a user account of a given username from database
   * @throws {APP_ERRORS.USERNAME_NOT_FOUND}
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param userId
   * @returns user id, username, and password hash of fetched account
   */
  async getAccountUsername(username: string) {
    const [selectRes, selectErr] = await etp(
      this.liveVideoSyncDB
        .select({
          userId: ACCOUNTS_TABLE.userId,
          username: ACCOUNTS_TABLE.username,
          passwordHash: ACCOUNTS_TABLE.passwordHash,
        })
        .from(ACCOUNTS_TABLE)
        .where(eq(ACCOUNTS_TABLE.username, username))
        .limit(1),
    );

    if (selectErr) throw new APP_ERRORS.UNEXPECTED_DATABASE_ERROR().causedBy(selectErr);
    if (selectRes.length === 0) throw new APP_ERRORS.USERNAME_NOT_FOUND(username);

    return selectRes[0];
  }
}
