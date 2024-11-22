import type {BadRequest} from '@shared/errors/http-errors.js';
import {expect} from 'vitest';

export function checkBadRequestError(error: BadRequest, keys: Array<string>) {
  const requestErrorKeys = error.requestErrors.map(({key}: {key: string}) => key);
  for (const k of keys) expect(requestErrorKeys).toContain(k);
}
