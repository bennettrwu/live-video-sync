// eslint-disable-next-line n/no-extraneous-import
import inject from 'light-my-request';
import {expect} from 'vitest';

export function checkSuccessResponseFormat(response: inject.Response, code: number, requestId: string) {
  expect(response.statusCode).toBe(code);
  expect(response.json()).toMatchObject({
    statusCode: code,
    success: true,
    requestId,
  });
}
