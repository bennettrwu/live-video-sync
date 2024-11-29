import {describe, expect} from 'vitest';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import checkSessionCookie from '../check-session-cookie.js';
import {checkSuccessResponseFormat} from '@test/utils/validators/check-success-response-format.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import setupAccountHandlerTests, {type AccountRoutesTestContext} from '../setup-account-handler-tests.js';
import formatTestNames from '@test/utils/format-test-names.js';

describe<AccountRoutesTestContext>('/accounts/v1/login handler', it => {
  setupAccountHandlerTests();

  const userId = 1;
  const username = 'testUser1';
  const password = 'somepassword';
  const token = 'someSessionToken';
  const expires = new Date();

  it('logs user in', async ({fastify, config, defaultReqId, accountsService, sessionService}) => {
    accountsService.validateAccountCredentials.mockResolvedValue(userId);
    sessionService.createNewSession.mockResolvedValue({token, expires});

    const response = await fastify.inject({method: 'POST', url: '/accounts/v1/login', body: {username, password}});

    checkSuccessResponseFormat(response, 200, defaultReqId);
    checkSessionCookie(response.cookies[0], token, expires, config.server.cookieSigningKey);
    expect(accountsService.validateAccountCredentials).toHaveBeenCalledWith(username, password);
    expect(sessionService.createNewSession).toHaveBeenCalledWith(userId);
  });

  it('reject invalid credentials', async ({fastify, errorHandlerMock, accountsService}) => {
    accountsService.validateAccountCredentials.mockRejectedValue(new APP_ERRORS.INVALID_ACCOUNT_CREDENTIALS());

    await fastify.inject({method: 'POST', url: '/accounts/v1/login', body: {username, password}});

    expect(errorHandlerMock.mock.calls[0][0]).toBeInstanceOf(HTTP_ERRORS.UNAUTHORIZED);
  });

  it('converts unexpected errors to 500 http error', async ({
    fastify,
    errorHandlerMock,
    accountsService,
    sessionService,
  }) => {
    accountsService.createNewAccount.mockResolvedValue({userId, username, passwordHash: 'somehash'});
    sessionService.createNewSession.mockRejectedValue(new Error('some error'));

    await fastify.inject({method: 'POST', url: '/accounts/v1/login', body: {username, password}});

    expect(errorHandlerMock.mock.calls[0][0]).toBeInstanceOf(HTTP_ERRORS.INTERNAL_SERVER_ERROR);
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
