import {HTTP_ERRORS, type BadRequest} from '@shared/errors/http-errors.js';
import {expect} from 'vitest';

export function checkBadRequestError(error: BadRequest, keys: Array<string>) {
  expect(error).toBeInstanceOf(HTTP_ERRORS.BAD_REQUEST);
  const requestErrorKeys = error.requestErrors.map(({key}: {key: string}) => key);
  expect(requestErrorKeys).toEqual(expect.arrayContaining(keys));
}
