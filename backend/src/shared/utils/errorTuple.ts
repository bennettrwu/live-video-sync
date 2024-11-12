import {APP_ERRORS} from '../errors/app-errors.js';

/**
 * Given a promise, returns a new promise that wraps the original that resolves to a tuple
 * If the promise resolves successfully, the tuple is [<result>, undefined]
 * If the promise throws an error, the tuple is [undefined, <error>]
 * If the error is an instance of Error, the error is returned as is
 * Otherwise, it is wrapped in a APP_ERRORS.THROWN_OBJECT_NOT_ERROR error
 * @throws {APP_ERRORS.THROWN_OBJECT_NOT_ERROR}
 * @param p
 * @returns wrapped promise
 */
export async function errorTuplePromise<R>(p: Promise<R>): Promise<[R, undefined] | [undefined, Error]> {
  try {
    const r = await p;
    return [r, undefined];
  } catch (error) {
    if (error instanceof Error) return [undefined, error];
    return [undefined, new APP_ERRORS.THROWN_OBJECT_NOT_ERROR().causedBy(error)];
  }
}

/**
 * Given a function and its arguments, calls the function and returns the result as a tuple
 * If the function executes successfully, the tuple is [<result>, undefined]
 * If the function throws an error, the tuple is [undefined, <error>]
 * If the error is an instance of Error, the error is returned as is
 * Otherwise, it is wrapped in a APP_ERRORS.THROWN_OBJECT_NOT_ERROR error
 * @throws {APP_ERRORS.THROWN_OBJECT_NOT_ERROR}
 * @param p
 * @returns result tuple
 */
export function errorTupleFunction<R>(
  f: (...args: unknown[]) => R,
  ...args: unknown[]
): [R, undefined] | [undefined, Error] {
  try {
    const r = f(...args);
    return [r, undefined];
  } catch (error) {
    if (error instanceof Error) return [undefined, error];
    return [undefined, new APP_ERRORS.THROWN_OBJECT_NOT_ERROR().causedBy(error)];
  }
}
