import {APP_ERRORS} from '@shared/errors/app-errors.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import type {FastifyInstance} from 'fastify';
import Fastify from 'fastify';
import type {Logger} from 'pino';
import {beforeEach, describe, expect, vi, type Mock, type Mocked, type TestContext} from 'vitest';
import fakeLogger from '../../test-utils/fake-logger.js';
import errorHandler from '@server/plugins/error-handler.js';

interface LocalTestContext extends TestContext {
  fastify: FastifyInstance;
  loggerMock: Mocked<Logger>;
  routeHandlerMock: Mock;
}

describe('Error handler', () => {
  const requestId = 'testid';
  const errorMessage = 'something wrong';

  beforeEach<LocalTestContext>(context => {
    context.loggerMock = fakeLogger();
    context.fastify = Fastify({
      genReqId: () => requestId,
      loggerInstance: context.loggerMock,
    }) as unknown as FastifyInstance;

    context.fastify.register(errorHandler);

    context.routeHandlerMock = vi.fn();
    context.fastify.get('/test', context.routeHandlerMock);
  });

  describe<LocalTestContext>('Error handler response', it => {
    it('returns correct response on bad request errors', async ({fastify, routeHandlerMock}) => {
      const requestErrors = [
        {message: 'error1', key: '/body/something'},
        {message: 'error2', key: '/body/something'},
      ];

      routeHandlerMock.mockRejectedValue(new HTTP_ERRORS.BAD_REQUEST(requestErrors));

      const response = await fastify.inject({method: 'GET', url: '/test'});

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({statusCode: 400, success: false, requestErrors, requestId});
    });

    it('returns correct response on unauthorized errors', async ({fastify, routeHandlerMock}) => {
      routeHandlerMock.mockRejectedValue(new HTTP_ERRORS.UNAUTHORIZED(errorMessage));

      const response = await fastify.inject({method: 'GET', url: '/test'});

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({statusCode: 401, success: false, message: errorMessage, requestId});
    });

    it('returns correct response on forbidden errors', async ({fastify, routeHandlerMock}) => {
      routeHandlerMock.mockRejectedValue(new HTTP_ERRORS.FORBIDDEN(errorMessage));

      const response = await fastify.inject({method: 'GET', url: '/test'});

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({statusCode: 403, success: false, message: errorMessage, requestId});
    });

    it('returns correct response on not found errors', async ({fastify, routeHandlerMock}) => {
      routeHandlerMock.mockRejectedValue(new HTTP_ERRORS.NOT_FOUND(errorMessage));

      const response = await fastify.inject({method: 'GET', url: '/test'});

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({statusCode: 404, success: false, message: errorMessage, requestId});
    });

    it('returns correct response on internal server errors', async ({fastify, routeHandlerMock}) => {
      routeHandlerMock.mockRejectedValue(new HTTP_ERRORS.INTERNAL_SERVER_ERROR(errorMessage));

      const response = await fastify.inject({method: 'GET', url: '/test'});

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({statusCode: 500, success: false, message: errorMessage, requestId});
    });

    it('returns correct response on app errors', async ({fastify, routeHandlerMock}) => {
      routeHandlerMock.mockRejectedValue(new APP_ERRORS.UNHANDLED_REJECTION(errorMessage));

      const response = await fastify.inject({method: 'GET', url: '/test'});

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        statusCode: 500,
        success: false,
        message: 'Sever encountered an unexpected error. Please try again later.',
        requestId,
      });
    });

    it('returns correct response on unknown errors', async ({fastify, routeHandlerMock}) => {
      routeHandlerMock.mockRejectedValue(new Error(errorMessage));

      const response = await fastify.inject({method: 'GET', url: '/test'});

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        statusCode: 500,
        success: false,
        message: 'Sever encountered an unexpected error. Please try again later.',
        requestId,
      });
    });
  });

  describe<LocalTestContext>('Error handler logging', it => {
    it('logs warning on operational errors', async ({fastify, routeHandlerMock, loggerMock}) => {
      routeHandlerMock.mockRejectedValue(new HTTP_ERRORS.UNAUTHORIZED(errorMessage));

      await fastify.inject({method: 'GET', url: '/test'});

      expect(loggerMock.warn).toHaveBeenCalledOnce();
    });

    it('logs error on non operational errors', async ({fastify, routeHandlerMock, loggerMock}) => {
      routeHandlerMock.mockRejectedValue(new HTTP_ERRORS.INTERNAL_SERVER_ERROR(errorMessage));

      await fastify.inject({method: 'GET', url: '/test'});

      expect(loggerMock.error).toHaveBeenCalledOnce();
    });

    it('logs error on unhandled app errors', async ({fastify, routeHandlerMock, loggerMock}) => {
      routeHandlerMock.mockRejectedValue(new APP_ERRORS.UNHANDLED_REJECTION(errorMessage));

      await fastify.inject({method: 'GET', url: '/test'});

      expect(loggerMock.error).toHaveBeenCalledOnce();
    });

    it('logs error on unhandled unknown errors', async ({fastify, routeHandlerMock, loggerMock}) => {
      routeHandlerMock.mockRejectedValue(new Error(errorMessage));

      await fastify.inject({method: 'GET', url: '/test'});

      expect(loggerMock.error).toHaveBeenCalledOnce();
    });
  });
});
