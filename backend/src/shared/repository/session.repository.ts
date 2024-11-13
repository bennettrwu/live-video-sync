import pg from 'pg';
import {SESSIONS_TABLE, SESSIONS_VIEW} from '../live-video-sync-db/live-video-sync-db.schema.js';
import {errorTuplePromise as etp} from '@shared/utils/errorTuple.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import {eq} from 'drizzle-orm';

declare global {
  export interface Dependencies {
    sessionRepository: SessionRepository;
  }
}

export default class SessionRepository {
  constructor(private liveVideoSyncDB: Dependencies['liveVideoSyncDB']) {}

  /**
   * Inserts a given session for a user id with expiration into database
   * @throws {APP_ERRORS.USER_ID_NOT_FOUND}
   * @throws {APP_ERRORS.DUPLICATE_SESSION_TOKEN}
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param userId
   * @param token
   * @param expires
   */
  async saveSessionToken(userId: number, token: string, expires: Date) {
    const [, insertErr] = await etp(this.liveVideoSyncDB.insert(SESSIONS_TABLE).values({token, userId, expires}));

    if (insertErr) {
      if (insertErr instanceof pg.DatabaseError) {
        if (insertErr.constraint === 'sessions_userId_accounts_userId_fk') {
          throw new APP_ERRORS.USER_ID_NOT_FOUND(userId).causedBy(insertErr);
        }
        if (insertErr.constraint === 'sessions_pkey') {
          throw new APP_ERRORS.DUPLICATE_SESSION_TOKEN().causedBy(insertErr);
        }
      }
      throw new APP_ERRORS.UNEXPECTED_DATABASE_ERROR().causedBy(insertErr);
    }
  }

  /**
   * Gets the user id of a corresponding valid (expiry in future) session from database
   * @throws {APP_ERRORS.VALID_SESSION_NOT_FOUND}
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param sessionToken
   * @returns user id
   */
  async getValidSession(sessionToken: string) {
    const [selectRes, selectErr] = await etp(
      this.liveVideoSyncDB
        .select({userId: SESSIONS_VIEW.userId})
        .from(SESSIONS_VIEW)
        .where(eq(SESSIONS_VIEW.token, sessionToken)),
    );

    if (selectErr) throw new APP_ERRORS.UNEXPECTED_DATABASE_ERROR().causedBy(selectErr);

    if (selectRes.length === 0) throw new APP_ERRORS.VALID_SESSION_NOT_FOUND();
    return selectRes[0].userId;
  }

  /**
   * Updates given session with new expiration
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param sessionToken
   * @param newExpiry
   */
  async updateSessionExpiry(sessionToken: string, newExpiry: Date) {
    const [, updateErr] = await etp(
      this.liveVideoSyncDB
        .update(SESSIONS_TABLE)
        .set({expires: newExpiry})
        .where(eq(SESSIONS_TABLE.token, sessionToken)),
    );
    if (updateErr) throw new APP_ERRORS.UNEXPECTED_DATABASE_ERROR().causedBy(updateErr);
  }

  /**
   * Deletes a given entry with matching session token from the database
   * @throws {APP_ERRORS.UNEXPECTED_DATABASE_ERROR}
   * @param sessionToken
   */
  async deleteSession(sessionToken: string) {
    const [, deleteErr] = await etp(
      this.liveVideoSyncDB.delete(SESSIONS_TABLE).where(eq(SESSIONS_TABLE.token, sessionToken)),
    );
    if (deleteErr) throw new APP_ERRORS.UNEXPECTED_DATABASE_ERROR().causedBy(deleteErr);
  }
}
