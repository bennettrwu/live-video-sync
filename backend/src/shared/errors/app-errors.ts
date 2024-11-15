import {format} from 'util';

// Base error class of all application errors
export class AppError extends Error {
  cause?: unknown;
  code = 'APP_ERROR_CODE';
  message = 'App Error';
  name = 'AppError';
  isOperational = true;

  /**
   * Sets the cause property of app error with given error
   * Also updates isOperational property if given error is an instance of AppError
   * @param e
   * @returns
   */
  causedBy(e: unknown) {
    this.cause = e;
    if (e instanceof AppError) this.isOperational = e.isOperational;
    return this;
  }
}

/**
 * Produces custom app error class derived from AppError with code, isOperational, and message template already set
 * Created error object takes arguments that are used in the message template to create message
 * @param code
 * @param messageTemplate
 * @param isOperational
 * @returns custom app error class
 */
export function createAppError(code: string, messageTemplate: string, isOperational: boolean) {
  return class CustomAppError extends AppError {
    constructor(...args: Array<unknown>) {
      super();
      this.cause = undefined;
      this.code = code;
      this.isOperational = isOperational;
      this.message = format(messageTemplate, ...args);
      Error.stackTraceLimit !== 0 && Error.captureStackTrace(this, CustomAppError);
    }
  };
}

// All application errors
export const APP_ERRORS = Object.freeze({
  UNHANDLED_REJECTION: createAppError('UNHANDLED_REJECTION', 'A promise rejection was not caught and handled', false),

  THROWN_OBJECT_NOT_ERROR: createAppError(
    'THROWN_OBJECT_NOT_ERROR',
    'A non error entity was thrown as an error',
    false,
  ),

  NO_USER_ID_ON_UNAUTHENTICATED_ENDPOINT: createAppError(
    'NO_USER_ID_ON_UNAUTHENTICATED_ENDPOINT',
    'Cannot fetch user id on an unauthenticated endpoint. Did you add the authentication preHandler?',
    false,
  ),

  NO_TOKEN_ON_UNAUTHENTICATED_ENDPOINT: createAppError(
    'NO_TOKEN_ON_UNAUTHENTICATED_ENDPOINT',
    'Cannot fetch session token on an unauthenticated endpoint. Did you add the authentication preHandler?',
    false,
  ),

  UNCAUGHT_NON_HTTP_ERROR: createAppError(
    'UNCAUGHT_NON_HTTP_ERROR',
    'An application error was thrown but not converted to HTTP error before reaching fastify error handler',
    false,
  ),

  UNCAUGHT_UNKNOWN_ERROR: createAppError(
    'UNCAUGHT_UNKNOWN_ERROR',
    'An unknown error was thrown and not converted to HTTP error before reaching fastify error handler',
    false,
  ),

  UNDEFINED_SCHEMA_ERROR_MESSAGE: createAppError(
    'UNDEFINED_SCHEMA_ERROR_MESSAGE',
    'A schema validation error occured on property that did not have a user facing errorMessage defined',
    false,
  ),

  UNEXPECTED_DATABASE_ERROR: createAppError('UNEXPECTED_DATABASE_ERROR', 'An unexpected database error occured', false),

  PASSWORD_HASH_ERROR: createAppError('PASSWORD_HASH_ERROR', 'Unexpected failure when hashing password', false),

  PASSWORD_VERIFY_ERROR: createAppError('PASSWORD_VERIFY_ERROR', 'Unexpected failure when verifying password', false),

  INVALID_USERNAME: createAppError('INVALID_USERNAME', '%s', true),

  DUPLICATE_USERNAME: createAppError('DUPLICATE_USERNAME', 'User with username "%s" already exists in database', true),

  USER_ID_NOT_FOUND: createAppError('USER_ID_NOT_FOUND', 'User with user_id %i was not found in database', true),

  USERNAME_NOT_FOUND: createAppError('USERNAME_NOT_FOUND', 'User with username %i was not found in database', true),

  DUPLICATE_SESSION_TOKEN: createAppError('DUPLICATE_SESSION_TOKEN', 'Session token already exists in database', true),

  VALID_SESSION_NOT_FOUND: createAppError(
    'VALID_SESSION_NOT_FOUND',
    'Session token was not found in database or was expired',
    true,
  ),

  INVALID_ACCOUNT_CREDENTIALS: createAppError(
    'INVALID_ACCOUNT_CREDENTIALS',
    'Prodived account credentials did not match',
    true,
  ),
});
