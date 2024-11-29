import {describe, expect} from 'vitest';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import checkSessionCookie from '../check-session-cookie.js';
import {checkSuccessResponseFormat} from '@test/utils/validators/check-success-response-format.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {checkBadRequestError} from '@test/utils/validators/check-bad-request-error.js';
import formatTestNames from '@test/utils/format-test-names.js';
import type {AccountRoutesTestContext} from '../setup-account-handler-tests.js';
import setupAccountHandlerTests from '../setup-account-handler-tests.js';

describe<AccountRoutesTestContext>('/accounts/v1/create handler', it => {
  setupAccountHandlerTests();

  const userId = 1;
  const username = 'testUser1';
  const password = 'somepassword';
  const token = 'someSessionToken';
  const expires = new Date();

  it('creates user account and returns session token in cookie', async ({
    fastify,
    defaultReqId,
    config,
    accountsService,
    sessionService,
  }) => {
    accountsService.createNewAccount.mockImplementation(async uname => {
      return {userId, username: uname, passwordHash: 'somehash'};
    });
    sessionService.createNewSession.mockResolvedValue({token, expires});

    const response = await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: {username, password}});

    checkSuccessResponseFormat(response, 201, defaultReqId);
    checkSessionCookie(response.cookies[0], token, expires, config.server.cookieSigningKey);
    expect(accountsService.createNewAccount).toHaveBeenCalledWith(username, password);
    expect(sessionService.createNewSession).toHaveBeenCalledWith(userId);
  });

  it('rejects duplicate accounts', async ({fastify, accountsService, errorHandlerMock}) => {
    accountsService.createNewAccount.mockRejectedValue(new APP_ERRORS.DUPLICATE_USERNAME());

    await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: {username, password}});

    checkBadRequestError(errorHandlerMock.mock.calls[0][0], ['/body/username']);
  });

  it('converts unexpected errors to 500 http error', async ({
    fastify,
    accountsService,
    sessionService,
    errorHandlerMock,
  }) => {
    accountsService.createNewAccount.mockResolvedValue({userId, username, passwordHash: 'somehash'});
    sessionService.createNewSession.mockRejectedValue(new Error('some error'));

    await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: {username, password}});

    expect(errorHandlerMock.mock.calls[0][0]).toBeInstanceOf(HTTP_ERRORS.INTERNAL_SERVER_ERROR);
  });

  it('rejects invalid usernames', async ({fastify, errorHandlerMock, accountsService}) => {
    accountsService.isValidUsername.mockImplementation(() => {
      throw new APP_ERRORS.INVALID_USERNAME('invalid');
    });

    await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: {username, password}});

    checkBadRequestError(errorHandlerMock.mock.calls[0][0], ['/body/username']);
  });

  it.for(
    formatTestNames([
      {},
      {username: {}, password},
      {username, password: {}},
      {username: '', password},
      {username: '1'.repeat(17), password},
      {username, password: '1'.repeat(7)},
      {name: 'very long password', username, password: '1'.repeat(257)},
    ]),
  )('rejects invalid request bodies: %s', async ([, body], {fastify, typeValidatorErrorHandlerMock}) => {
    await fastify.inject({
      method: 'POST',
      url: '/accounts/v1/create',
      body,
      headers: {'content-type': 'application/json'},
    });

    expect(typeValidatorErrorHandlerMock).toHaveBeenCalled();
  });
});
