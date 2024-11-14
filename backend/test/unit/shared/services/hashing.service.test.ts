import {APP_ERRORS} from '@shared/errors/app-errors.js';
import HashingService from '@shared/services/hashing.service.js';
import {describe, expect, it, vi} from 'vitest';

vi.mock('argon2');

describe('Hashing service', () => {
  it('verifies valid passwords', async () => {
    vi.unmock('argon2');
    const hashingService = new HashingService();
    const password = 'some password';

    const hash = await hashingService.hashPassword(password);
    const valid = await hashingService.verifyPassword(password, hash);

    expect(valid).toBe(true);
  });

  it('rejects invalid passwords', async () => {
    vi.unmock('argon2');
    const hashingService = new HashingService();
    const password = 'some password';

    const hash = await hashingService.hashPassword(password);
    const valid = await hashingService.verifyPassword('invalid', hash);

    expect(valid).toBe(false);
  });

  it('wraps unexpected hashing errors', async () => {
    const argon2 = await import('argon2');
    argon2.default.hash = vi.fn().mockRejectedValue(new Error('test'));
    argon2.default.verify = vi.fn().mockRejectedValue(new Error('test'));

    const hashingService = new HashingService();

    const hashResult = hashingService.hashPassword('some password');
    const verifyResult = hashingService.verifyPassword('some password', 'some hash');

    await expect(hashResult).rejects.toThrowError(APP_ERRORS.PASSWORD_HASH_ERROR);
    await expect(verifyResult).rejects.toThrowError(APP_ERRORS.PASSWORD_VERIFY_ERROR);
  });
});
