import {describe, expect} from 'vitest';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import setupAccountHandlerTests, {type AccountRoutesTestContext} from '../setup-account-handler-tests.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {checkSuccessResponseFormat} from '@test/utils/validators/check-success-response-format.js';

describe<AccountRoutesTestContext>('/accounts/v1/who-am-i handler', it => {
  setupAccountHandlerTests();

  const userId = 1;
  const username = 'testUser1';
  const passwordHash = 'someHash';
  const token = 'someSessionToken';

  it('invalidates user session', async ({fastify, defaultReqId, accountsRepository, getUserIdMock}) => {
    getUserIdMock.mockReturnValue(userId);
    accountsRepository.getAccountUserId.mockResolvedValue({userId, username, passwordHash});

    const response = await fastify.inject({
      method: 'GET',
      url: '/accounts/v1/who-am-i',
      cookies: {sessionToken: token},
    });

    expect(accountsRepository.getAccountUserId).toHaveBeenCalledWith(userId);
    checkSuccessResponseFormat(response, 200, defaultReqId);
    expect(response.json().username).toBe(username);
  });

  it('returns 401 if user id not found', async ({fastify, errorHandlerMock, accountsRepository}) => {
    accountsRepository.getAccountUserId.mockRejectedValue(new APP_ERRORS.USER_ID_NOT_FOUND());

    await fastify.inject({method: 'GET', url: '/accounts/v1/who-am-i', cookies: {sessionToken: token}});

    expect(errorHandlerMock.mock.calls[0][0]).instanceOf(HTTP_ERRORS.UNAUTHORIZED);
  });

  it('converts unexpected errors to 500 http error', async ({fastify, errorHandlerMock, accountsRepository}) => {
    accountsRepository.getAccountUserId.mockRejectedValue(new Error('some error'));

    await fastify.inject({method: 'GET', url: '/accounts/v1/who-am-i', cookies: {sessionToken: token}});

    expect(errorHandlerMock.mock.calls[0][0]).instanceOf(HTTP_ERRORS.INTERNAL_SERVER_ERROR);
  });
});
