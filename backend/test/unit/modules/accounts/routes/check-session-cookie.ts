// eslint-disable-next-line n/no-extraneous-import
import inject from 'light-my-request';
import {unsign} from '@fastify/cookie';
import {expect} from 'vitest';

export default function checkSessionCookie(
  cookie: inject.Response['cookies'][number],
  token: string,
  expires: Date,
  cookieSecret: string,
) {
  const {valid, value} = unsign(cookie.value, cookieSecret);

  expect(valid).toBeTruthy();
  expect(value).toBe(token);
  expect(cookie.name).toBe('sessionToken');
  expect(cookie.httpOnly).toBeTruthy();
  expect(cookie.secure).toBeTruthy();
  expect(cookie.sameSite).toBe('Strict');
  expect(Math.abs(cookie.expires!.getTime() - expires.getTime())).toBeLessThan(1_000);
}
