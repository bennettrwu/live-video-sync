// eslint-disable-next-line n/no-extraneous-import
import inject from 'light-my-request';
import {expect} from 'vitest';

export function checkSuccessResponseFormat(response: inject.Response, code: number) {
  const body = response.json();

  expect(response.statusCode).toBe(code);
  expect(body.statusCode).toBe(code);
  expect(body.success).toBe(true);
}
