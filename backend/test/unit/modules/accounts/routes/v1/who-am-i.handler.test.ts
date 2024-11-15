import SessionService from '@shared/services/session.service.js';
import {checkErrorResponse, checkSuccessResponse} from '@test/unit/utils/check-response.js';
import fakeClass from '@test/unit/utils/fake-class.js';
import useTestFastifyInstance, {type FastifyTestContext} from '@test/unit/utils/use-test-fastify-instance.js';
import {asValue} from 'awilix';
import {beforeEach, describe, expect, it, type Mocked} from 'vitest';
import AccountsRepository from '@src/modules/accounts/repository/accounts.repository.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';

interface LocalTestContext extends FastifyTestContext {
  accountsRepository: Mocked<AccountsRepository>;
  sessionService: Mocked<SessionService>;
}

describe('/accounts/v1/who-am-i handler', () => {
  const userId = 1;
  const username = 'testUser1';
  const passwordHash = 'someHash';
  const token = 'someSessionToken';

  beforeEach<LocalTestContext>(context => {
    useTestFastifyInstance(context);

    context.accountsRepository = fakeClass(AccountsRepository);
    context.sessionService = fakeClass(SessionService);

    context.container.register({
      accountsRepository: asValue(context.accountsRepository),
      sessionService: asValue(context.sessionService),
    });
  });

  it<LocalTestContext>('invalidates user session', async ({fastify, accountsRepository, getUserIdMock}) => {
    getUserIdMock.mockReturnValue(userId);
    accountsRepository.getAccountUserId.mockResolvedValue({userId, username, passwordHash});

    const response = await fastify.inject({
      method: 'GET',
      url: '/accounts/v1/who-am-i',
      cookies: {sessionToken: token},
    });

    expect(accountsRepository.getAccountUserId).toHaveBeenCalledWith(userId);
    checkSuccessResponse(response, 200);
    expect(response.json().username).toBe(username);
  });

  it<LocalTestContext>('returns 404 if user id not found', async ({fastify, accountsRepository}) => {
    accountsRepository.getAccountUserId.mockRejectedValue(new APP_ERRORS.USER_ID_NOT_FOUND());

    const response = await fastify.inject({
      method: 'GET',
      url: '/accounts/v1/who-am-i',
      cookies: {sessionToken: token},
    });

    checkErrorResponse(response, 401);
  });

  it<LocalTestContext>('converts unexpected errors to 500 http error', async ({fastify, accountsRepository}) => {
    accountsRepository.getAccountUserId.mockRejectedValue(new Error('some error'));

    const response = await fastify.inject({
      method: 'GET',
      url: '/accounts/v1/who-am-i',
      cookies: {sessionToken: token},
    });

    checkErrorResponse(response, 500);
  });
});
