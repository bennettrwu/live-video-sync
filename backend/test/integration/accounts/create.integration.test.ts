import {ACCOUNTS_TABLE} from '@shared/live-video-sync-db/live-video-sync-db.schema.js';
import checkSessionCookie from '@test/unit/modules/accounts/routes/check-session-cookie.js';
import formatTestNames from '@test/utils/format-test-names.js';
import {fillTestDb, type FilledDbTestContext} from '@test/utils/test-setup/fill-test-db.js';
import setupIntegrationTest, {IntegrationTestContext} from '@test/utils/test-setup/setup-integration-test.js';
import {checkBadRequestResponseFormat} from '@test/utils/validators/check-response-format.js';
import {checkSuccessResponseFormat} from '@test/utils/validators/check-success-response-format.js';
import {beforeEach, describe, expect} from 'vitest';

type LocalTestContext = IntegrationTestContext & FilledDbTestContext;

describe<LocalTestContext>('/accounts/v1/create integration test', it => {
  const username = 'testUser1';
  const password = 'somepassword';
  const requestId = 'request id';

  setupIntegrationTest();
  beforeEach<LocalTestContext>(async context => {
    await fillTestDb(context);
  });

  it('it accepts valid request with correct response and updates db', async ({fastify}) => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/accounts/v1/create',
      body: {username, password},
      headers: {'x-request-id': requestId},
    });

    checkSuccessResponseFormat(response, 201, requestId);
  });

  it.for(
    formatTestNames([
      {name: 'empty body', params: undefined, expectedKeys: ['/body']},
      {params: {}, expectedKeys: ['/body/username', '/body/password']},
      {params: {username: {}, password}, expectedKeys: ['/body/username']},
      {params: {username, password: {}}, expectedKeys: ['/body/password']},
      {params: {username: '', password}, expectedKeys: ['/body/username']},
      {params: {username: '1'.repeat(17), password}, expectedKeys: ['/body/username']},
      {params: {username, password: '1'.repeat(7)}, expectedKeys: ['/body/password']},
      {name: 'very long password', params: {username, password: '1'.repeat(257)}, expectedKeys: ['/body/password']},
    ]),
  )('rejects invalid request body with correct response: %s', async ([, {params, expectedKeys}], {fastify}) => {
    const response = await fastify.inject({method: 'POST', url: '/accounts/v1/create', body: params});

    checkBadRequestResponseFormat(response, expectedKeys);
  });

  it('rejects existing usernames with correct response: %s', async () => {
    //
  });
});
