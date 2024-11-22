import fastifyCookie, {sign} from '@fastify/cookie';
import sessionAuthentication from '@server/plugins/session-authentication.js';
import { APP_ERRORS } from '@shared/errors/app-errors.js';
import { HTTP_ERRORS } from '@shared/errors/http-errors.js';
import SessionService from '@shared/services/session.service.js';
import fakeClass from '@test/unit/test-utils/fake-class.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/unit/test-utils/use-test-fastify-instance.js';
import {asValue} from 'awilix';
import {beforeEach, describe, expect, it, type Mocked} from 'vitest';

interface LocalTestContext extends FastifyTestContext {
  sessionService: Mocked<SessionService>;
}

describe('Session authentication', () => {
  const userId = 1;
  const newExpiry = new Date();
  const token = 'someToken';
  const cookieSecret = 'secret';

  useTestFastifyInstance({server: {cookieSigningKey: cookieSecret}});

  beforeEach<LocalTestContext>(context => {
    context.fastify.register(sessionAuthentication);

    context.fastify.register(f =>
      f.get('/auth', {preHandler: [context.fastify.authenticate]}, context.routeHandlerMock),
    );

    context.sessionService = fakeClass(SessionService);
    context.container.register({sessionService: asValue(context.sessionService)});
  });

  it<LocalTestContext>('accepts valid session token in cookie', async ({fastify, sessionService, routeHandlerMock}) => {
    sessionService.getAndRefreshSession.mockResolvedValue({userId, newExpiry});

    await fastify.inject({method: 'GET', url: '/auth', cookies: {sessionToken: sign(token, cookieSecret)}});

    expect(routeHandlerMock).toHaveBeenCalledOnce();
    expect(sessionService.getAndRefreshSession).toHaveBeenCalledWith(token);
  });

  it<LocalTestContext>('rejects invalid cookie', async ({fastify, errorHandlerMock}) => {
    await fastify.inject({method: 'GET', url: '/auth'});
    expect(errorHandlerMock.mock.calls[0][0]).instanceOf(HTTP_ERRORS.UNAUTHORIZED);

    errorHandlerMock.mockClear();

    await fastify.inject({method: 'GET', url: '/auth', cookies: {sessionToken: sign(token, 'wrongSecret')}});
    expect(errorHandlerMock.mock.calls[0][0]).instanceOf(HTTP_ERRORS.UNAUTHORIZED);
  });

  it<LocalTestContext>('rejects invalid session token', async ({fastify, sessionService, errorHandlerMock}) => {
    sessionService.getAndRefreshSession.mockRejectedValue(new APP_ERRORS.VALID_SESSION_NOT_FOUND());

    await fastify.inject({method: 'GET', url: '/auth', cookies: {sessionToken: sign(token, cookieSecret)}});

    expect(sessionService.getAndRefreshSession).toHaveBeenCalledWith(token);
    expect(errorHandlerMock.mock.calls[0][0]).instanceOf(HTTP_ERRORS.UNAUTHORIZED);
  });

  it<LocalTestContext>('converts unexpected errors to 500 http error', async ({
    fastify,
    sessionService,
    errorHandlerMock,
  }) => {
    sessionService.getAndRefreshSession.mockRejectedValue(new Error('some error'));

    await fastify.inject({method: 'GET', url: '/auth', cookies: {sessionToken: sign(token, cookieSecret)}});

    expect(sessionService.getAndRefreshSession).toHaveBeenCalledWith(token);
    expect(errorHandlerMock.mock.calls[0][0]).instanceOf(HTTP_ERRORS.INTERNAL_SERVER_ERROR);
  });

  it<LocalTestContext>('provides user id and session token after logging in', async ({
    fastify,
    sessionService,
    routeHandlerMock,
  }) => {
    sessionService.getAndRefreshSession.mockResolvedValue({userId, newExpiry});

    await fastify.inject({method: 'GET', url: '/auth', cookies: {sessionToken: sign(token, cookieSecret)}});

    expect(routeHandlerMock.mock.calls[0][0].getUserId()).toBe(userId);
    expect(routeHandlerMock.mock.calls[0][0].getSessionToken()).toBe(token);
  });

  it<LocalTestContext>('rejects getUserId usage on endpoints without authentication', async ({
    fastify,
    routeHandlerMock,
  }) => {
    fastify.register(f => f.get('/test', routeHandlerMock));

    await fastify.inject({method: 'GET', url: '/test', cookies: {sessionToken: sign(token, cookieSecret)}});

    expect(() => routeHandlerMock.mock.calls[0][0].getUserId()).toThrow(
      APP_ERRORS.NO_USER_ID_ON_UNAUTHENTICATED_ENDPOINT,
    );
  });

  it<LocalTestContext>('rejects getSessionToken usage on endpoints without authentication', async ({
    fastify,
    routeHandlerMock,
  }) => {
    fastify.register(f => f.get('/test', routeHandlerMock));

    await fastify.inject({method: 'GET', url: '/test', cookies: {sessionToken: sign(token, cookieSecret)}});

    expect(() => routeHandlerMock.mock.calls[0][0].getSessionToken()).toThrow(
      APP_ERRORS.NO_TOKEN_ON_UNAUTHENTICATED_ENDPOINT,
    );
  });
});
