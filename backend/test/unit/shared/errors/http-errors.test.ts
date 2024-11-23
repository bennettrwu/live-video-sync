import {BadRequest, createHttpError} from '@shared/errors/http-errors.js';
import {checkBadRequestError} from '@test/utils/validators/check-bad-request-error.js';
import {describe, expect} from 'vitest';

describe('Http errors', it => {
  it('bad request error has expected properties', () => {
    const requestErrors = [
      {message: '', key: '/body/prop1'},
      {message: '', key: '/body/prop2'},
    ];

    const error = new BadRequest(requestErrors);

    checkBadRequestError(error, ['/body/prop1', '/body/prop2']);
  });

  it('creates operational Http error', () => {
    const statusCode = 400;
    const message = 'Some operational message';
    const customError = createHttpError(statusCode, true);

    const error = new customError(message);

    expect(error.statusCode).toBe(statusCode);
    expect(error.message).toBe(message);
    expect(error.isOperational).toBeTruthy();
  });

  it('creates nonoperational Http error', () => {
    const statusCode = 500;
    const message = 'Some nonoperational message';
    const customError = createHttpError(statusCode, false);

    const error = new customError(message);

    expect(error.statusCode).toBe(statusCode);
    expect(error.message).toBe(message);
    expect(error.isOperational).toBeFalsy();
  });

  it('uses default error message if not defiled ', () => {
    const statusCode = 500;
    const customError = createHttpError(statusCode, false);

    const error = new customError();

    expect(error.message).toBe('Server encountered an unexpected error. Please try again later.');
  });

  it('allows setting a cause of error', () => {
    const customError = createHttpError(500, true);
    const cause = new Error('cause');

    const error = new customError().causedBy(cause);

    expect(error.cause).toEqual(cause);
  });

  it('bubbles up operational status', () => {
    const operationalError = createHttpError(400, true);
    const nonOperationalError = createHttpError(500, false);

    const error = new nonOperationalError().causedBy(new operationalError());

    expect(error.isOperational).toBeTruthy();
  });
});
