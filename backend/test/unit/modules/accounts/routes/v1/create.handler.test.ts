import accountsRoute from '@src/modules/accounts/routes/accounts.route.js';
import {asValue} from 'awilix';
import {beforeEach, describe, expect, it, type Mocked} from 'vitest';
import AccountsService from '@src/modules/accounts/services/accounts.service.js';
import SessionService from '@shared/services/session.service.js';
import type {AppFastifyInstance} from '@shared/types/fastify.js';
import fakeClass from '@test/unit/utils/fake-class.js';
import type {FastifyTestContext} from '@test/unit/utils/use-test-fastify-instance.js';
import useTestFastifyInstance from '@test/unit/utils/use-test-fastify-instance.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import checkSessionCookie from '../check-session-cookie.js';
import {checkClientErrorResponse, checkSuccessResponse} from '@test/unit/utils/check-response.js';

interface LocalTestContext extends FastifyTestContext {
  accountsService: Mocked<AccountsService>;
  sessionService: Mocked<SessionService>;
  fastify: AppFastifyInstance;
}

describe('/accounts/v1/create handler', () => {
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

    context.fastify.register(accountsRoute);
  });

  it<LocalTestContext>('creates user account', async ({fastify, accountsService, sessionService}) => {
    accountsService.createNewAccount.mockImplementation(async uname => {
      return {userId, username: uname, passwordHash: 'somehash'};
    });
    sessionService.createNewSession.mockResolvedValue({token, expires});

    const response = await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: {username, password}});

    expect(accountsService.createNewAccount).toHaveBeenCalledWith(username, password);
    expect(sessionService.createNewSession).toHaveBeenCalledWith(userId);
    checkSuccessResponse(response, 201);
    checkSessionCookie(response.cookies[0], token, expires);
  });

  it<LocalTestContext>('rejects duplicate accounts', async ({fastify, accountsService}) => {
    accountsService.createNewAccount.mockRejectedValue(new APP_ERRORS.DUPLICATE_USERNAME());

    const response = await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: {username, password}});

    checkClientErrorResponse(response, ['/body/username']);
  });

  it<LocalTestContext>('converts unexpected errors to 500 http error', async ({
    fastify,
    accountsService,
    sessionService,
  }) => {
    accountsService.createNewAccount.mockResolvedValue({userId, username, passwordHash: 'somehash'});
    sessionService.createNewSession.mockRejectedValue(new Error('some error'));

    const response = await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: {username, password}});
    const responseBody = response.json();

    expect(response.statusCode).toBe(500);
    expect(responseBody.statusCode).toBe(500);
    expect(responseBody.message).not.toBe('');
    expect(responseBody.success).toBeFalsy();
  });

  it<LocalTestContext>('rejects invalid username and/or passwords', async ({fastify, accountsService}) => {
    accountsService.isValidUsername.mockImplementation(() => {
      throw new APP_ERRORS.INVALID_USERNAME('bad');
    });
    let response = await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: {username, password}});
    checkClientErrorResponse(response, ['/body/username']);

    response = await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: {username: '', password}});
    checkClientErrorResponse(response, ['/body/username']);

    response = await fastify.inject({
      method: 'POST',
      url: '/accounts/v1/create',
      body: {username: '1'.repeat(17), password},
    });
    checkClientErrorResponse(response, ['/body/username']);

    response = await fastify.inject({
      method: 'POST',
      url: '/accounts/v1/create',
      body: {username, password: '1'.repeat(7)},
    });
    checkClientErrorResponse(response, ['/body/password']);

    response = await fastify.inject({
      method: 'POST',
      url: '/accounts/v1/create',
      body: {username, password: '1'.repeat(257)},
    });
    checkClientErrorResponse(response, ['/body/password']);
  });
});
