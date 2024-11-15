import SessionService from '@shared/services/session.service.js';
import {checkErrorResponse, checkSuccessResponse} from '@test/unit/utils/check-response.js';
import fakeClass from '@test/unit/utils/fake-class.js';
import useTestFastifyInstance, {type FastifyTestContext} from '@test/unit/utils/use-test-fastify-instance.js';
import {asValue} from 'awilix';
import {beforeEach, describe, expect, it, type Mocked} from 'vitest';
import checkSessionCookie from '../check-session-cookie.js';

interface LocalTestContext extends FastifyTestContext {
  sessionService: Mocked<SessionService>;
}

describe('/accounts/v1/logout handler', () => {
  const token = 'someSessionToken';

  beforeEach<LocalTestContext>(context => {
    useTestFastifyInstance(context);

    context.sessionService = fakeClass(SessionService);

    context.container.register({sessionService: asValue(context.sessionService)});
  });

  it<LocalTestContext>('invalidates user session', async ({fastify, sessionService, getSessionTokenMock}) => {
    getSessionTokenMock.mockReturnValue(token);

    const response = await fastify.inject({
      method: 'POST',
      url: '/accounts/v1/logout',
      cookies: {sessionToken: token},
    });

    expect(sessionService.invalidateUserSession).toHaveBeenCalledWith(token);
    checkSuccessResponse(response, 200);
    checkSessionCookie(response.cookies[0], '', new Date(0));
  });

  it<LocalTestContext>('converts unexpected errors to 500 http error', async ({fastify, sessionService}) => {
    sessionService.invalidateUserSession.mockRejectedValue(new Error('some error'));

    const response = await fastify.inject({
      method: 'POST',
      url: '/accounts/v1/logout',
      cookies: {sessionToken: token},
    });

    checkErrorResponse(response, 500);
  });
});
