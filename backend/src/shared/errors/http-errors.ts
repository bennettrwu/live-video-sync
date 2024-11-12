import {AppError} from './app-errors.js';

// Base class of errors thrown for fastify error handler use
// Should contain user facing error message
export class HttpError extends AppError {
  statusCode = 500;
  code = 'HTTP_ERROR';
  message = 'Server encountered an unexpected error. Please try again later.';
}

/**
 * Produces custom http error class derived from HttpError with statusCode set
 * @param statusCode
 * @returns custom http error class
 */
export function createHttpError(statusCode: number) {
  return class CustomHttpError extends HttpError {
    constructor(message?: string) {
      super();
      if (message !== undefined) this.message = message;
      this.statusCode = statusCode;
      this.cause = undefined;
      Error.stackTraceLimit !== 0 && Error.captureStackTrace(this, CustomHttpError);
    }
  };
}

// All http errors
export const HTTP_ERRORS = Object.freeze({
  BAD_REQUEST: createHttpError(400),
  UNAUTHORIZED: createHttpError(401),
  FORBIDDEN: createHttpError(403),
  NOT_FOUND: createHttpError(404),
  INTERNAL_SERVER_ERROR: createHttpError(500),
});
