import SessionRepository from '@shared/repository/session.repository.js';
import SessionService from '@shared/services/session.service.js';
import type {ConfigType} from '@src/config/config.js';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import crypto from 'crypto';
import {APP_ERRORS} from '@shared/errors/app-errors.js';

type Writeable<T> = {-readonly [P in keyof T]: T[P]};

interface LocalTestContext {
  crypto: typeof crypto;
  config: Writeable<ConfigType>;
  sessionRepository: SessionRepository;
  sessionService: SessionService;
}

vi.mock('crypto');

describe('Session service', () => {
  beforeEach<LocalTestContext>(async context => {
    context.crypto = (await import('crypto')).default;

    context.sessionRepository = {
      saveSessionToken: vi.fn(),
      getValidSession: vi.fn(),
      updateSessionExpiry: vi.fn(),
      deleteSession: vi.fn(),
    } as unknown as SessionRepository;

    context.config = {
      server: {
        loginSessionTTL: 60_000,
      },
    } as Writeable<ConfigType>;

    context.sessionService = new SessionService(context.config, context.sessionRepository);
  });

  describe('Creating sessions', () => {
    it<LocalTestContext>('creates new user session', async ({crypto, config, sessionRepository, sessionService}) => {
      const date = new Date(2024, 11, 14);
      vi.useFakeTimers();
      vi.setSystemTime(date);

      const token = 'deadbeef';
      const expires = new Date(date.getTime() + config.server.loginSessionTTL);

      crypto.randomBytes = vi.fn().mockReturnValue(Buffer.from(token, 'hex'));
      const randomBytesSpy = vi.spyOn(crypto, 'randomBytes');
      const saveSessionSpy = vi.spyOn(sessionRepository, 'saveSessionToken');

      const result = await sessionService.createNewSession(0);

      expect(result).toEqual({token, expires});
      expect(saveSessionSpy).toHaveBeenCalledWith(0, token, expires);
      expect(randomBytesSpy).toHaveBeenCalledWith(32);
    });

    it<LocalTestContext>('creates new user session with expiry according to config', async ({
      crypto,
      config,
      sessionRepository,
      sessionService,
    }) => {
      Object.assign(config.server, {loginSessionTTL: 10_000});
      const date = new Date(2024, 11, 14);
      vi.useFakeTimers();
      vi.setSystemTime(date);

      const token = 'deadbeef';
      const expires = new Date(date.getTime() + config.server.loginSessionTTL);

      crypto.randomBytes = vi.fn().mockReturnValue(Buffer.from(token, 'hex'));
      const randomBytesSpy = vi.spyOn(crypto, 'randomBytes');
      const saveSessionSpy = vi.spyOn(sessionRepository, 'saveSessionToken');

      const result = await sessionService.createNewSession(0);

      expect(result).toEqual({token, expires});
      expect(saveSessionSpy).toHaveBeenCalledWith(0, token, expires);
      expect(randomBytesSpy).toHaveBeenCalledWith(32);
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

      sessionRepository.saveSessionToken = vi
        .fn()
        .mockImplementation(() => new Promise((r, reject) => reject(new APP_ERRORS.DUPLICATE_SESSION_TOKEN())));

      const randomBytesSpy = vi.spyOn(crypto, 'randomBytes');
      const saveSessionSpy = vi.spyOn(sessionRepository, 'saveSessionToken');

      const createResult = sessionService.createNewSession(0);

      await expect(createResult).rejects.toThrow(APP_ERRORS.DUPLICATE_SESSION_TOKEN);
      expect(saveSessionSpy).toHaveBeenCalledTimes(10);
      expect(randomBytesSpy).toHaveBeenCalledTimes(10);
      expect(randomBytesSpy).toHaveBeenCalledWith(32);
    });

    it<LocalTestContext>('bubbles up other errors', async ({sessionRepository, sessionService}) => {
      const token = 'deadbeef';
      crypto.randomBytes = vi.fn().mockReturnValue(Buffer.from(token, 'hex'));

      const error = new Error('Some error');

      sessionRepository.saveSessionToken = vi.fn().mockImplementation(() => new Promise((r, reject) => reject(error)));

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

      sessionRepository.getValidSession = vi.fn().mockReturnValue(userId);
      const getSessionSpy = vi.spyOn(sessionRepository, 'getValidSession');
      const updateSessionSpy = vi.spyOn(sessionRepository, 'updateSessionExpiry');

      const result = await sessionService.getAndRefreshSession(token);

      expect(result).toEqual({userId, newExpiry});
      expect(getSessionSpy).toHaveBeenCalledWith(token);
      expect(updateSessionSpy).toHaveBeenCalledWith(token, newExpiry);
    });

    it<LocalTestContext>('gets user id of session and updates expiry according to config', async ({
      config,
      sessionRepository,
      sessionService,
    }) => {
      Object.assign(config.server, {loginSessionTTL: 10_000});
      const date = new Date(2024, 11, 14);
      vi.useFakeTimers();
      vi.setSystemTime(date);

      const userId = 0;
      const token = 'deadbeef';
      const newExpiry = new Date(date.getTime() + config.server.loginSessionTTL);

      sessionRepository.getValidSession = vi.fn().mockReturnValue(userId);
      const getSessionSpy = vi.spyOn(sessionRepository, 'getValidSession');
      const updateSessionSpy = vi.spyOn(sessionRepository, 'updateSessionExpiry');

      const result = await sessionService.getAndRefreshSession(token);

      expect(result).toEqual({userId, newExpiry});
      expect(getSessionSpy).toHaveBeenCalledWith(token);
      expect(updateSessionSpy).toHaveBeenCalledWith(token, newExpiry);
    });

    it<LocalTestContext>('bubbles up other errors', async ({sessionRepository, sessionService}) => {
      const error1 = new Error('Some error');
      const error2 = new Error('Some other error');

      sessionRepository.getValidSession = vi
        .fn()
        .mockImplementationOnce(() => new Promise((r, reject) => reject(error1)));
      const getResult1 = sessionService.getAndRefreshSession('token');

      sessionRepository.getValidSession = vi
        .fn()
        .mockImplementationOnce(() => new Promise((r, reject) => reject(error2)));
      const getResult2 = sessionService.getAndRefreshSession('token');

      await expect(getResult1).rejects.toThrow(error1);
      await expect(getResult2).rejects.toThrow(error2);
    });
  });

  describe('Invalidate session', () => {
    it<LocalTestContext>('deletes session entry', async ({sessionRepository, sessionService}) => {
      const token = 'deadbeef';
      const deleteSpy = vi.spyOn(sessionRepository, 'deleteSession');

      await sessionService.invalidateUserSession(token);

      expect(deleteSpy).toHaveBeenCalledWith(token);
    });

    it<LocalTestContext>('bubbles up other errors', async ({sessionRepository, sessionService}) => {
      const error = new Error('Some error');
      sessionRepository.deleteSession = vi.fn().mockImplementationOnce(() => new Promise((r, reject) => reject(error)));

      const invalidateResult = sessionService.invalidateUserSession('token');

      await expect(invalidateResult).rejects.toThrow(error);
    });
  });
});
