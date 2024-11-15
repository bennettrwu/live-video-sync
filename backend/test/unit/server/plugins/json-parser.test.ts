import type {JSONObject} from '@fastify/swagger';
import createServer from '@server/create-server.js';
import type {AppFastifyInstance} from '@shared/types/fastify.js';
import {checkErrorResponse} from '@test/unit/utils/check-response.js';
import fakeConfig from '@test/unit/utils/fake-config.js';
import fakeLogger from '@test/unit/utils/fake-logger.js';
import {asValue, createContainer, type AwilixContainer} from 'awilix';
import {beforeEach, describe, expect, it, type Mocked} from 'vitest';

interface LocalTestContext {
  container: AwilixContainer<Mocked<Dependencies>>;
  fastify: AppFastifyInstance;
}

describe('Json parser', () => {
  beforeEach<LocalTestContext>(context => {
    context.container = createContainer();
    context.container.register({
      logger: asValue(fakeLogger()),
      config: asValue(fakeConfig({})),
    });
    context.fastify = createServer(context.container);
  });

  it<LocalTestContext>('parses valid JSON', async ({fastify}) => {
    let parsedBody: JSONObject;
    fastify.register(f =>
      f.post('/test', {}, (req, reply) => {
        parsedBody = req.body as unknown as JSONObject;
        return reply.code(200).send();
      }),
    );

    async function testSendJSON(sentJson: JSONObject | JSONObject[keyof JSONObject]) {
      const response = await fastify.inject({
        method: 'POST',
        url: '/test',
        headers: {'content-type': 'application/json'},
        payload: JSON.stringify(sentJson),
      });

      expect(response.statusCode).toBe(200);
      expect(parsedBody).toEqual(sentJson);
    }

    await testSendJSON(null);
    await testSendJSON(false);
    await testSendJSON(true);
    await testSendJSON([null, false, true, [], {}, 1, 'string']);
    await testSendJSON(1);
    await testSendJSON('string');
    await testSendJSON({
      a: null,
      b: false,
      c: true,
      d: [
        null,
        false,
        true,
        [null, false, true, [], {}, 1, 'string'],
        {a: null, b: false, c: true, d: [], e: {}, f: 1, g: 'string'},
        1,
        'string',
      ],
      e: {a: null, b: false, c: true, d: [], e: {}, f: 1, g: 'string'},
      f: 1,
      g: 'string',
    });
  });

  it<LocalTestContext>('rejects invalid JSON', async ({fastify}) => {
    fastify.register(f => f.post('/test', {}, (req, reply) => reply.code(200).send()));

    async function testSendInvalidJSON(invalidJson: string) {
      const response = await fastify.inject({
        method: 'POST',
        url: '/test',
        headers: {'content-type': 'application/json'},
        payload: invalidJson,
      });

      checkErrorResponse(response, 400);
    }

    await testSendInvalidJSON('');
    await testSendInvalidJSON('string');
    await testSendInvalidJSON('undefined');
    await testSendInvalidJSON('{ test: error }');
    await testSendInvalidJSON('[,]');
    await testSendInvalidJSON('{ "oops": "extra", "comma: "here", }');
  });
});
