// eslint-disable-next-line n/no-extraneous-import
import inject from 'light-my-request';
import {expect} from 'vitest';

export function checkErrorResponse(response: inject.Response, code: number) {
  const body = response.json();

  expect(response.statusCode).toBe(code);
  expect(body.statusCode).toBe(code);
  expect(body.success).toBe(false);
  expect(body.message).not.toBe('');
}

export function checkClientErrorResponse(response: inject.Response, keys: Array<string>) {
  const body = response.json();

  expect(response.statusCode).toBe(400);
  expect(body.statusCode).toBe(400);
  expect(body.success).toBe(false);

  const requestErrorKeys = body.requestErrors.map(({key}: {key: string}) => key);
  for (const k of keys) {
    expect(requestErrorKeys).toContain(k);
  }
}

export function checkSuccessResponse(response: inject.Response, code: number) {
  const body = response.json();

  expect(response.statusCode).toBe(code);
  expect(body.statusCode).toBe(code);
  expect(body.success).toBe(true);
}
