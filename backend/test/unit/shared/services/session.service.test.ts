import SessionRepository from '@shared/repository/session.repository.js';
import SessionService from '@shared/services/session.service.js';
import type {ConfigType} from '@config/config-schema.js';
import {beforeEach, describe, expect, vi, type Mocked} from 'vitest';
import crypto from 'crypto';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import fakeClass from '@test/utils/fakes/fake-class.js';
import fakeConfig from '@test/utils/fakes/fake-config.js';
import type {Writeable} from '@shared/types/writeable.js';

interface LocalTestContext {
  crypto: typeof crypto;
  config: Writeable<ConfigType>;
  sessionRepository: Mocked<SessionRepository>;
  sessionService: SessionService;
}

vi.mock('crypto');

describe('Session service', () => {
  const userId = 0;
  const date = new Date(2024, 11, 14);
  const tokens = ['abc0', 'abc1', 'abc2', 'abc3', 'abc4', 'abc5', 'abc6', 'abc7', 'abc8', 'abc9'];
  const defaultLoginSessionTTL = 60_000;
  const defaultExpectedExpires = new Date(date.getTime() + defaultLoginSessionTTL);
  const error1 = new Error('Some error');
  const error2 = new Error('Some other error');

  beforeEach<LocalTestContext>(async context => {
    context.crypto = (await import('crypto')).default;
    context.sessionRepository = fakeClass(SessionRepository);
    context.config = fakeConfig({server: {loginSessionTTL: defaultLoginSessionTTL}});

    vi.useFakeTimers();
    vi.setSystemTime(date);

    context.sessionService = new SessionService(context.config, context.sessionRepository);
  });

  describe<LocalTestContext>('Creating sessions', it => {
    it('creates new user session', async ({crypto, sessionRepository, sessionService}) => {
      crypto.randomBytes = vi.fn().mockReturnValue(Buffer.from(tokens[0], 'hex'));

      const result = await sessionService.createNewSession(0);

      expect(result).toEqual({token: tokens[0], expires: defaultExpectedExpires});
      expect(sessionRepository.saveSessionToken).toHaveBeenCalledWith(0, tokens[0], defaultExpectedExpires);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it('creates new user session with configured expiry', async ({
      crypto,
      config,
      sessionRepository,
      sessionService,
    }) => {
      const newLoginSessionTTL = 10_000;
      const expectedExpires = new Date(date.getTime() + newLoginSessionTTL);

      Object.assign(config.server, {loginSessionTTL: newLoginSessionTTL});
      crypto.randomBytes = vi.fn().mockReturnValue(Buffer.from(tokens[0], 'hex'));

      const result = await sessionService.createNewSession(0);

      expect(result).toEqual({token: tokens[0], expires: expectedExpires});
      expect(sessionRepository.saveSessionToken).toHaveBeenCalledWith(0, tokens[0], expectedExpires);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it('retries on session token conflict before erroring', async ({crypto, sessionRepository, sessionService}) => {
      let cryptoMock = vi.fn();
      for (let i = 0; i < 10; i++) cryptoMock = cryptoMock.mockReturnValueOnce(Buffer.from(tokens[i], 'hex'));
      crypto.randomBytes = cryptoMock;
      sessionRepository.saveSessionToken.mockRejectedValue(new APP_ERRORS.DUPLICATE_SESSION_TOKEN());

      const createResult = sessionService.createNewSession(0);

      await expect(createResult).rejects.toThrow(APP_ERRORS.DUPLICATE_SESSION_TOKEN);
      expect(sessionRepository.saveSessionToken).toHaveBeenCalledTimes(10);
      expect(crypto.randomBytes).toHaveBeenCalledTimes(10);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it('bubbles up other errors', async ({sessionRepository, sessionService}) => {
      crypto.randomBytes = vi.fn().mockReturnValue(Buffer.from(tokens[0], 'hex'));
      sessionRepository.saveSessionToken.mockRejectedValue(error1);

      const createResult = sessionService.createNewSession(0);

      await expect(createResult).rejects.toThrow(error1);
    });
  });

  describe<LocalTestContext>('Fetching and refreshing sessions', it => {
    it('gets user id of session and updates expiry', async ({sessionRepository, sessionService}) => {
      sessionRepository.getValidSession.mockResolvedValue(userId);

      const result = await sessionService.getAndRefreshSession(tokens[0]);

      expect(result).toEqual({userId, newExpiry: defaultExpectedExpires});
      expect(sessionRepository.getValidSession).toHaveBeenCalledWith(tokens[0]);
      expect(sessionRepository.updateSessionExpiry).toHaveBeenCalledWith(tokens[0], defaultExpectedExpires);
    });

    it('gets user id of session and updates expiry', async ({config, sessionRepository, sessionService}) => {
      const newLoginSessionTTL = 10_000;
      const newExpiry = new Date(date.getTime() + newLoginSessionTTL);

      Object.assign(config.server, {loginSessionTTL: newLoginSessionTTL});
      sessionRepository.getValidSession.mockResolvedValue(userId);

      const result = await sessionService.getAndRefreshSession(tokens[0]);

      expect(result).toEqual({userId, newExpiry});
      expect(sessionRepository.getValidSession).toHaveBeenCalledWith(tokens[0]);
      expect(sessionRepository.updateSessionExpiry).toHaveBeenCalledWith(tokens[0], newExpiry);
    });

    it('bubbles up other errors', async ({sessionRepository, sessionService}) => {
      sessionRepository.getValidSession.mockRejectedValueOnce(error1);
      const getResult1 = sessionService.getAndRefreshSession('token');

      sessionRepository.getValidSession.mockRejectedValueOnce(error2);
      const getResult2 = sessionService.getAndRefreshSession('token');

      await expect(getResult1).rejects.toThrow(error1);
      await expect(getResult2).rejects.toThrow(error2);
    });
  });

  describe<LocalTestContext>('Invalidate session', it => {
    it('deletes session entry', async ({sessionRepository, sessionService}) => {
      await sessionService.invalidateUserSession(tokens[0]);

      expect(sessionRepository.deleteSession).toHaveBeenCalledWith(tokens[0]);
    });

    it('bubbles up other errors', async ({sessionRepository, sessionService}) => {
      sessionRepository.deleteSession.mockRejectedValue(error1);

      const invalidateResult = sessionService.invalidateUserSession(tokens[0]);

      await expect(invalidateResult).rejects.toThrow(error1);
    });
  });
});
