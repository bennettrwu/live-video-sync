import {checkSuccessResponseFormat} from '@test/unit/test-utils/check-success-response-format.js';
import {describe, expect} from 'vitest';
import checkSessionCookie from '../check-session-cookie.js';
import setupAccountHandlerTests, {type AccountRoutesTestContext} from '../setup-account-handler-tests.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';

describe<AccountRoutesTestContext>('/accounts/v1/logout handler', it => {
  setupAccountHandlerTests();

  const token = 'someSessionToken';

  it('invalidates user session', async ({fastify, config, sessionService, getSessionTokenMock}) => {
    getSessionTokenMock.mockReturnValue(token);

    const response = await fastify.inject({
      method: 'POST',
      url: '/accounts/v1/logout',
      cookies: {sessionToken: token},
    });

    expect(sessionService.invalidateUserSession).toHaveBeenCalledWith(token);
    checkSuccessResponseFormat(response, 200);
    checkSessionCookie(response.cookies[0], '', new Date(0), config.server.cookieSigningKey);
  });

  it('converts unexpected errors to 500 http error', async ({fastify, errorHandlerMock, sessionService}) => {
    sessionService.invalidateUserSession.mockRejectedValue(new Error('some error'));

    await fastify.inject({method: 'POST', url: '/accounts/v1/logout', cookies: {sessionToken: token}});

    expect(errorHandlerMock.mock.calls[0][0]).toBeInstanceOf(HTTP_ERRORS.INTERNAL_SERVER_ERROR);
  });
});
