/* eslint-disable @typescript-eslint/only-throw-error */
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import {errorTupleFunction, errorTuplePromise} from '@shared/utils/errorTuple.js';
import {describe, expect, it} from 'vitest';

describe('Error tuple promise wrapper', () => {
  it('returns result if resolves', async () => {
    const [result, err] = await errorTuplePromise(new Promise(resolve => resolve('something')));

    expect(result).toBe('something');
    expect(err).toBeUndefined();
  });

  it('returns error if rejects', async () => {
    const error = new Error('some error');

    const [result, err] = await errorTuplePromise(new Promise((r, reject) => reject(error)));

    expect(result).toBeUndefined();
    expect(err).toBe(error);
  });

  it.for([undefined, null, NaN, false, '', 0, [], {}])('wraps error if rejects with non error', async nonError => {
    const [result, err] = await errorTuplePromise(new Promise((r, reject) => reject(nonError)));

    expect(result).toBeUndefined();
    expect(err).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
  });
});

describe('Error tuple function wrapper', () => {
  it('returns result if no errors thrown', async () => {
    const [result, err] = errorTupleFunction((a, b) => a + b, 10, 20);

    expect(result).toBe(30);
    expect(err).toBeUndefined();
  });

  it('returns error if error is thrown', async () => {
    const error = new Error('some error');

    const [result, err] = errorTupleFunction(() => {
      throw error;
    });

    expect(result).toBeUndefined();
    expect(err).toBe(error);
  });

  it.for([undefined, null, NaN, false, '', 0, [], {}])('wraps error if non error thrown', nonError => {
    const [result, err] = errorTupleFunction(() => {
      throw nonError;
    });

    expect(result).toBeUndefined();
    expect(err).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
  });
});
