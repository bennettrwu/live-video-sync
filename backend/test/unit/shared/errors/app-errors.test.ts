import {createAppError} from '@shared/errors/app-errors.js';
import {describe, expect} from 'vitest';

describe('App errors', it => {
  it('creates operational app error', () => {
    const code = 'OPERATIONAL_APP_ERROR';
    const message = 'Some operational message';
    const customError = createAppError(code, message, false);

    const error = new customError();

    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
    expect(error.isOperational).toBeFalsy();
  });

  it('creates nonoperational app error', () => {
    const code = 'NONOPERATIONAL_APP_ERROR';
    const message = 'Some nonoperational message';
    const customError = createAppError(code, message, true);

    const error = new customError();

    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
    expect(error.isOperational).toBeTruthy();
  });

  it('creates app error with formatable message', () => {
    const code = 'FORMATTED_APP_ERROR';
    const message = 'Some %s that is %s';
    const customError = createAppError(code, message, true);

    const error = new customError('message', 'formatted');

    expect(error.code).toBe(code);
    expect(error.message).toBe('Some message that is formatted');
    expect(error.isOperational).toBeTruthy();
  });

  it('allows setting a cause of error', () => {
    const customError = createAppError('ERROR', 'msg', true);
    const cause = new Error('cause');

    const error = new customError().causedBy(cause);

    expect(error.cause).toEqual(cause);
  });

  it('bubbles up operational status', () => {
    const operationalError = createAppError('OPERATIONAL', 'msg', true);
    const nonOperationalError = createAppError('NONOPERATIONAL', 'msg', false);

    const error = new nonOperationalError().causedBy(new operationalError());

    expect(error.isOperational).toBeTruthy();
  });
});
