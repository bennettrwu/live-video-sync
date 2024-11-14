/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable no-throw-literal */
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

  it('wraps error if rejects with non error', async () => {
    const [result0, err0] = await errorTuplePromise(new Promise((r, reject) => reject()));
    const [result1, err1] = await errorTuplePromise(new Promise((r, reject) => reject(null)));
    const [result2, err2] = await errorTuplePromise(new Promise((r, reject) => reject(NaN)));
    const [result3, err3] = await errorTuplePromise(new Promise((r, reject) => reject(undefined)));
    const [result4, err4] = await errorTuplePromise(new Promise((r, reject) => reject(false)));
    const [result5, err5] = await errorTuplePromise(new Promise((r, reject) => reject('')));
    const [result6, err6] = await errorTuplePromise(new Promise((r, reject) => reject(0)));
    const [result7, err7] = await errorTuplePromise(new Promise((r, reject) => reject([])));
    const [result8, err8] = await errorTuplePromise(new Promise((r, reject) => reject({})));

    expect(result0).toBeUndefined();
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
    expect(result3).toBeUndefined();
    expect(result4).toBeUndefined();
    expect(result5).toBeUndefined();
    expect(result6).toBeUndefined();
    expect(result7).toBeUndefined();
    expect(result8).toBeUndefined();
    expect(err0).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err1).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err2).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err3).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err4).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err5).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err6).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err7).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err8).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
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

  it('wraps error if non error thrown', () => {
    const [result0, err0] = errorTupleFunction(() => {
      throw null;
    });
    const [result1, err1] = errorTupleFunction(() => {
      throw NaN;
    });
    const [result2, err2] = errorTupleFunction(() => {
      throw undefined;
    });
    const [result3, err3] = errorTupleFunction(() => {
      throw false;
    });
    const [result4, err4] = errorTupleFunction(() => {
      throw '';
    });
    const [result5, err5] = errorTupleFunction(() => {
      throw 0;
    });
    const [result6, err6] = errorTupleFunction(() => {
      throw [];
    });
    const [result7, err7] = errorTupleFunction(() => {
      throw {};
    });

    expect(result0).toBeUndefined();
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
    expect(result3).toBeUndefined();
    expect(result4).toBeUndefined();
    expect(result5).toBeUndefined();
    expect(result6).toBeUndefined();
    expect(result7).toBeUndefined();
    expect(err0).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err1).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err2).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err3).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err4).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err5).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err6).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
    expect(err7).toBeInstanceOf(APP_ERRORS.THROWN_OBJECT_NOT_ERROR);
  });
});
