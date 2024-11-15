import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';
import type {FastifyReply, FastifyRequest} from 'fastify';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {errorTuplePromise as etp} from '@shared/utils/errorTuple.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';

declare module 'fastify' {
  // _userId property not included because it should be treated as private
  interface FastifyRequest {
    getUserId: () => number;
    getSessionToken: () => string;
  }

  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Decorate fastify authenticate functions to handle session authentication
 * Also decorates requests with getUserId function to fetch authenticated user id
 *
 * Routes that need session authentication should use the 'authenticate' decorator as a prehandler
 * Then the getUserId decorator can be used to get the logged in user of the request
 */
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  // Decorate requests with _userId property which is use by the getUserId function
  // Should be treated as a private property and only fetched using getUserId() decorator
  fastify.decorateRequest('_userId', -1);
  // Same thing for sessionToken
  fastify.decorateRequest('_sessionToken', '');

  // No arrow function to keep req context
  fastify.decorateRequest('getUserId', function () {
    const userId = (this as unknown as {[key: string]: number})._userId;
    if (userId === -1) throw new APP_ERRORS.NO_USER_ID_ON_UNAUTHENTICATED_ENDPOINT();
    return userId;
  });
  fastify.decorateRequest('getSessionToken', function () {
    const sessionToken = (this as unknown as {[key: string]: string})._sessionToken;
    if (sessionToken === '') throw new APP_ERRORS.NO_TOKEN_ON_UNAUTHENTICATED_ENDPOINT();
    return sessionToken;
  });

  // Checks users session cookie and determines if it is valid
  // If valid, refreshes expiration in database and cookie, otherwise rejects request
  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    const sessionService = req.diScope.resolve('sessionService');

    const sessionCookie = req.cookies['sessionToken'];
    if (sessionCookie === undefined) {
      throw new HTTP_ERRORS.UNAUTHORIZED('Invalid session. Are you logged in?');
    }

    const {valid, value: sessionToken} = req.unsignCookie(sessionCookie);
    if (!valid) throw new HTTP_ERRORS.UNAUTHORIZED('Invalid session. Are you logged in?');

    const [getRes, getErr] = await etp(sessionService.getAndRefreshSession(sessionToken));
    if (getErr) {
      if (getErr instanceof APP_ERRORS.VALID_SESSION_NOT_FOUND) {
        throw new HTTP_ERRORS.UNAUTHORIZED('Session expired. Please log in again.');
      }
      throw new HTTP_ERRORS.INTERNAL_SERVER_ERROR(
        'Something went wrong on our end checking your session. Please try again later.',
      ).causedBy(getErr);
    }

    reply.setCookie('sessionToken', sessionToken, {
      expires: getRes.newExpiry,
      signed: true,
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    (req as unknown as {[key: string]: number})._userId = getRes.userId;
    (req as unknown as {[key: string]: string})._sessionToken = sessionToken;
  });
});
