import {sign} from '@fastify/cookie';
import createServer from '@server/create-server.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import SessionService from '@shared/services/session.service.js';
import type {AppFastifyInstance} from '@shared/types/fastify.js';
import {checkErrorResponse} from '@test/unit/utils/check-response.js';
import fakeClass from '@test/unit/utils/fake-class.js';
import fakeConfig from '@test/unit/utils/fake-config.js';
import fakeLogger from '@test/unit/utils/fake-logger.js';
import {asValue, createContainer, type AwilixContainer} from 'awilix';
import {beforeEach, describe, expect, it, type Mocked} from 'vitest';

interface LocalTestContext {
  container: AwilixContainer<Mocked<Dependencies>>;
  sessionService: Mocked<SessionService>;
  fastify: AppFastifyInstance;
}

describe('Session authentication', () => {
  const userId = 1;
  const newExpiry = new Date();
  const cookieSecret = 'cookieSecret';
  const token = 'someToken';

  beforeEach<LocalTestContext>(context => {
    context.container = createContainer();
    context.sessionService = fakeClass(SessionService);
    context.container.register({
      logger: asValue(fakeLogger()),
      config: asValue(fakeConfig({server: {cookieSigningKey: cookieSecret}})),
      sessionService: asValue(context.sessionService),
    });
    context.fastify = createServer(context.container);

    context.fastify.register(f => {
      f.get('/auth', {preHandler: [context.fastify.authenticate]}, (req, reply) => reply.code(200).send());
    });
  });

  it<LocalTestContext>('accepts valid session token in cookie', async ({fastify, sessionService}) => {
    sessionService.getAndRefreshSession.mockResolvedValue({userId, newExpiry});

    const response = await fastify.inject({
      method: 'GET',
      url: '/auth',
      cookies: {sessionToken: sign(token, cookieSecret)},
    });

    expect(response.statusCode).toBe(200);
    expect(sessionService.getAndRefreshSession).toHaveBeenCalledWith(token);
  });

  it<LocalTestContext>('rejects invalid cookie', async ({fastify}) => {
    const noCookieResponse = await fastify.inject({method: 'GET', url: '/auth'});
    checkErrorResponse(noCookieResponse, 401);

    const badSignResponse = await fastify.inject({
      method: 'GET',
      url: '/auth',
      cookies: {sessionToken: sign(token, 'not a real secret')},
    });
    checkErrorResponse(badSignResponse, 401);
  });

  it<LocalTestContext>('rejects invalid session token', async ({fastify, sessionService}) => {
    sessionService.getAndRefreshSession.mockRejectedValue(new APP_ERRORS.VALID_SESSION_NOT_FOUND());

    const response = await fastify.inject({
      method: 'GET',
      url: '/auth',
      cookies: {sessionToken: sign(token, cookieSecret)},
    });

    expect(sessionService.getAndRefreshSession).toHaveBeenCalledWith(token);
    checkErrorResponse(response, 401);
  });

  it<LocalTestContext>('converts unexpected errors to 500 http error', async ({fastify, sessionService}) => {
    sessionService.getAndRefreshSession.mockRejectedValue(new Error('some error'));

    const response = await fastify.inject({
      method: 'GET',
      url: '/auth',
      cookies: {sessionToken: sign(token, cookieSecret)},
    });

    expect(sessionService.getAndRefreshSession).toHaveBeenCalledWith(token);
    checkErrorResponse(response, 500);
  });

  it<LocalTestContext>('provides user id and username after logging in', async ({fastify, sessionService}) => {
    sessionService.getAndRefreshSession.mockResolvedValue({userId, newExpiry});
    let providedUserId: number;
    let providedToken: string;
    fastify.register(f => {
      f.get('/test', {preHandler: [fastify.authenticate]}, (req, reply) => {
        providedUserId = req.getUserId();
        providedToken = req.getSessionToken();
        return reply.code(200).send();
      });
    });

    await fastify.inject({method: 'GET', url: '/test', cookies: {sessionToken: sign(token, cookieSecret)}});

    expect(providedUserId!).toBe(userId);
    expect(providedToken!).toBe(token);
  });

  it<LocalTestContext>('rejects getUserId usage on endpoints without authentication', async ({fastify}) => {
    let error;
    fastify.register(f => {
      f.get('/test', (req, reply) => {
        try {
          req.getUserId();
        } catch (e) {
          error = e;
        }
        return reply.code(200).send();
      });
    });

    await fastify.inject({method: 'GET', url: '/test', cookies: {sessionToken: sign(token, cookieSecret)}});

    expect(error).instanceOf(APP_ERRORS.NO_USER_ID_ON_UNAUTHENTICATED_ENDPOINT);
  });

  it<LocalTestContext>('rejects getSessionToken usage on endpoints without authentication', async ({fastify}) => {
    let error;
    fastify.register(f => {
      f.get('/test', (req, reply) => {
        try {
          req.getSessionToken();
        } catch (e) {
          error = e;
        }
        return reply.code(200).send();
      });
    });

    await fastify.inject({method: 'GET', url: '/test', cookies: {sessionToken: sign(token, cookieSecret)}});

    expect(error).instanceOf(APP_ERRORS.NO_TOKEN_ON_UNAUTHENTICATED_ENDPOINT);
  });
});
