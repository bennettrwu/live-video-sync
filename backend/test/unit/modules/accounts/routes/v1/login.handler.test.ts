import {asValue} from 'awilix';
import {beforeEach, describe, expect, it, type Mocked} from 'vitest';
import AccountsService from '@src/modules/accounts/services/accounts.service.js';
import SessionService from '@shared/services/session.service.js';
import fakeClass from '@test/unit/utils/fake-class.js';
import type {FastifyTestContext} from '@test/unit/utils/use-test-fastify-instance.js';
import useTestFastifyInstance from '@test/unit/utils/use-test-fastify-instance.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import checkSessionCookie from '../check-session-cookie.js';
import {checkErrorResponse, checkSuccessResponse} from '@test/unit/utils/check-response.js';

interface LocalTestContext extends FastifyTestContext {
  accountsService: Mocked<AccountsService>;
  sessionService: Mocked<SessionService>;
}

describe('/accounts/v1/login handler', () => {
  const userId = 1;
  const username = 'testUser1';
  const password = 'somepassword';
  const token = 'someSessionToken';
  const expires = new Date();

  beforeEach<LocalTestContext>(context => {
    useTestFastifyInstance(context);

    context.accountsService = fakeClass(AccountsService);
    context.sessionService = fakeClass(SessionService);

    context.container.register({
      accountsService: asValue(context.accountsService),
      sessionService: asValue(context.sessionService),
    });
  });

  it<LocalTestContext>('logs user in', async ({fastify, config, accountsService, sessionService}) => {
    accountsService.validateAccountCredentials.mockResolvedValue(userId);
    sessionService.createNewSession.mockResolvedValue({token, expires});

    const response = await fastify.inject({method: 'POST', url: '/accounts/v1/login', body: {username, password}});

    expect(accountsService.validateAccountCredentials).toHaveBeenCalledWith(username, password);
    expect(sessionService.createNewSession).toHaveBeenCalledWith(userId);
    checkSuccessResponse(response, 200);
    checkSessionCookie(response.cookies[0], token, expires, config.server.cookieSigningKey);
  });

  it<LocalTestContext>('reject invalid credentials', async ({fastify, accountsService}) => {
    accountsService.validateAccountCredentials.mockRejectedValue(new APP_ERRORS.INVALID_ACCOUNT_CREDENTIALS());

    const response = await fastify.inject({method: 'POST', url: '/accounts/v1/login', body: {username, password}});

    checkErrorResponse(response, 401);
  });

  it<LocalTestContext>('converts unexpected errors to 500 http error', async ({
    fastify,
    accountsService,
    sessionService,
  }) => {
    accountsService.createNewAccount.mockResolvedValue({userId, username, passwordHash: 'somehash'});
    sessionService.createNewSession.mockRejectedValue(new Error('some error'));

    const response = await fastify.inject({method: 'POST', url: '/accounts/v1/login', body: {username, password}});

    checkErrorResponse(response, 500);
  });
});
