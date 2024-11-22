import {describe, expect, it} from 'vitest';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import setupAccountHandlerTests, {type AccountRoutesTestContext} from '../setup-account-handler-tests.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {checkSuccessResponseFormat} from '@test/unit/test-utils/check-success-response-format.js';

describe('/accounts/v1/who-am-i handler', () => {
  setupAccountHandlerTests();

  const userId = 1;
  const username = 'testUser1';
  const passwordHash = 'someHash';
  const token = 'someSessionToken';

  it<AccountRoutesTestContext>('invalidates user session', async ({fastify, accountsRepository, getUserIdMock}) => {
    getUserIdMock.mockReturnValue(userId);
    accountsRepository.getAccountUserId.mockResolvedValue({userId, username, passwordHash});

    const response = await fastify.inject({
      method: 'GET',
      url: '/accounts/v1/who-am-i',
      cookies: {sessionToken: token},
    });

    expect(accountsRepository.getAccountUserId).toHaveBeenCalledWith(userId);
    checkSuccessResponseFormat(response, 200);
    expect(response.json().username).toBe(username);
  });

  it<AccountRoutesTestContext>('returns 401 if user id not found', async ({
    fastify,
    errorHandlerMock,
    accountsRepository,
  }) => {
    accountsRepository.getAccountUserId.mockRejectedValue(new APP_ERRORS.USER_ID_NOT_FOUND());

    await fastify.inject({method: 'GET', url: '/accounts/v1/who-am-i', cookies: {sessionToken: token}});

    expect(errorHandlerMock.mock.calls[0][0]).instanceOf(HTTP_ERRORS.UNAUTHORIZED);
  });

  it<AccountRoutesTestContext>('converts unexpected errors to 500 http error', async ({
    fastify,
    errorHandlerMock,
    accountsRepository,
  }) => {
    accountsRepository.getAccountUserId.mockRejectedValue(new Error('some error'));

    await fastify.inject({method: 'GET', url: '/accounts/v1/who-am-i', cookies: {sessionToken: token}});

    expect(errorHandlerMock.mock.calls[0][0]).instanceOf(HTTP_ERRORS.INTERNAL_SERVER_ERROR);
  });
});
