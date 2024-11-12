import argon2 from 'argon2';
import {errorTuplePromise as etp} from '@shared/utils/errorTuple.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';

declare global {
  export interface Dependencies {
    hashingService: HashingService;
  }
}

export default class HashingService {
  /**
   * Produces password hash of given password
   * @throws {APP_ERRORS.PASSWORD_HASH_ERROR}
   * @param password
   * @returns hashed password
   */
  async hashPassword(password: string) {
    const [hashRes, hashErr] = await etp(argon2.hash(password));

    if (hashErr) throw new APP_ERRORS.PASSWORD_HASH_ERROR().causedBy(hashErr);
    return hashRes;
  }

  /**
   * Verifies if password and hash match
   * @throws {APP_ERRORS.PASSWORD_VERIFY_ERROR}
   * @param password
   * @param passwordHash
   * @returns true if match, false otherwise
   */
  async verifyPassword(password: string, passwordHash: string) {
    const [verifyRes, verifyErr] = await etp(argon2.verify(passwordHash, password));

    if (verifyErr) throw new APP_ERRORS.PASSWORD_VERIFY_ERROR().causedBy(verifyErr);
    return verifyRes;
  }
}
