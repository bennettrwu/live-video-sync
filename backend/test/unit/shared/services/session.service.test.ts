import SessionRepository from '@shared/repository/session.repository.js';
import SessionService from '@shared/services/session.service.js';
import type {ConfigType} from '@src/config/config.js';
import {beforeEach, describe, expect, it, vi, type Mocked} from 'vitest';
import crypto from 'crypto';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import fakeClass from '../../fake-class.js';
import type {Writeable} from '../../fake-config.js';
import fakeConfig from '../../fake-config.js';

interface LocalTestContext {
  crypto: typeof crypto;
  config: Writeable<ConfigType>;
  sessionRepository: Mocked<SessionRepository>;
  sessionService: SessionService;
}

vi.mock('crypto');

describe('Session service', () => {
  beforeEach<LocalTestContext>(async context => {
    context.crypto = (await import('crypto')).default;
    context.sessionRepository = fakeClass(SessionRepository);
    context.config = fakeConfig({
      server: {
        loginSessionTTL: 60_000,
      },
    });

    context.sessionService = new SessionService(context.config, context.sessionRepository);
  });

  describe('Creating sessions', () => {
    it<LocalTestContext>('creates new user session', async ({crypto, config, sessionRepository, sessionService}) => {
      const date = new Date(2024, 11, 14);
      const token = 'deadbeef';
      const expires = new Date(date.getTime() + config.server.loginSessionTTL);

      vi.useFakeTimers();
      vi.setSystemTime(date);
      crypto.randomBytes = vi.fn().mockReturnValue(Buffer.from(token, 'hex'));

      const result = await sessionService.createNewSession(0);

      expect(result).toEqual({token, expires});
      expect(sessionRepository.saveSessionToken).toHaveBeenCalledWith(0, token, expires);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it<LocalTestContext>('creates new user session with expiry according to config', async ({
      crypto,
      config,
      sessionRepository,
      sessionService,
    }) => {
      const newLoginSessionTTL = 10_000;

      const date = new Date(2024, 11, 14);
      const token = 'deadbeef';
      const expires = new Date(date.getTime() + newLoginSessionTTL);

      vi.useFakeTimers();
      vi.setSystemTime(date);
      Object.assign(config.server, {loginSessionTTL: newLoginSessionTTL});
      crypto.randomBytes = vi.fn().mockReturnValue(Buffer.from(token, 'hex'));

      const result = await sessionService.createNewSession(0);

      expect(result).toEqual({token, expires});
      expect(sessionRepository.saveSessionToken).toHaveBeenCalledWith(0, token, expires);
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });

    it<LocalTestContext>('retries on session token conflict before erroring', async ({
      crypto,
      sessionRepository,
      sessionService,
    }) => {
      const tokens = [
        'deadbeef',
        'deadbef0',
        'deadbef1',
        'deadbef2',
        'deadbef3',
        'deadbef4',
        'deadbef5',
        'deadbef6',
        'deadbef7',
        'deadbef8',
      ];

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

    it<LocalTestContext>('bubbles up other errors', async ({sessionRepository, sessionService}) => {
      const token = 'deadbeef';
      const error = new Error('Some error');

      crypto.randomBytes = vi.fn().mockReturnValue(Buffer.from(token, 'hex'));
      sessionRepository.saveSessionToken.mockRejectedValue(error);

      const createResult = sessionService.createNewSession(0);

      await expect(createResult).rejects.toThrow(error);
    });
  });

  describe('Fetching and refreshing sessions', () => {
    it<LocalTestContext>('gets user id of session and updates expiry', async ({
      config,
      sessionRepository,
      sessionService,
    }) => {
      const date = new Date(2024, 11, 14);
      vi.useFakeTimers();
      vi.setSystemTime(date);

      const userId = 0;
      const token = 'deadbeef';
      const newExpiry = new Date(date.getTime() + config.server.loginSessionTTL);

      sessionRepository.getValidSession.mockResolvedValue(userId);

      const result = await sessionService.getAndRefreshSession(token);

      expect(result).toEqual({userId, newExpiry});
      expect(sessionRepository.getValidSession).toHaveBeenCalledWith(token);
      expect(sessionRepository.updateSessionExpiry).toHaveBeenCalledWith(token, newExpiry);
    });

    it<LocalTestContext>('gets user id of session and updates expiry according to config', async ({
      config,
      sessionRepository,
      sessionService,
    }) => {
      const newLoginSessionTTL = 10_000;

      const date = new Date(2024, 11, 14);
      const userId = 0;
      const token = 'deadbeef';
      const newExpiry = new Date(date.getTime() + newLoginSessionTTL);

      Object.assign(config.server, {loginSessionTTL: newLoginSessionTTL});
      sessionRepository.getValidSession.mockResolvedValue(userId);

      const result = await sessionService.getAndRefreshSession(token);

      expect(result).toEqual({userId, newExpiry});
      expect(sessionRepository.getValidSession).toHaveBeenCalledWith(token);
      expect(sessionRepository.updateSessionExpiry).toHaveBeenCalledWith(token, newExpiry);
    });

    it<LocalTestContext>('bubbles up other errors', async ({sessionRepository, sessionService}) => {
      const error1 = new Error('Some error');
      const error2 = new Error('Some other error');

      sessionRepository.getValidSession.mockRejectedValueOnce(error1);
      const getResult1 = sessionService.getAndRefreshSession('token');

      sessionRepository.getValidSession.mockRejectedValueOnce(error2);
      const getResult2 = sessionService.getAndRefreshSession('token');

      await expect(getResult1).rejects.toThrow(error1);
      await expect(getResult2).rejects.toThrow(error2);
    });
  });

  describe('Invalidate session', () => {
    it<LocalTestContext>('deletes session entry', async ({sessionRepository, sessionService}) => {
      const token = 'deadbeef';

      await sessionService.invalidateUserSession(token);

      expect(sessionRepository.deleteSession).toHaveBeenCalledWith(token);
    });

    it<LocalTestContext>('bubbles up other errors', async ({sessionRepository, sessionService}) => {
      const error = new Error('Some error');
      sessionRepository.deleteSession.mockRejectedValue(error);

      const invalidateResult = sessionService.invalidateUserSession('token');

      await expect(invalidateResult).rejects.toThrow(error);
    });
  });
});
