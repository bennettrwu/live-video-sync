import jsonParser from '@server/plugins/json-parser.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {useTestFastifyInstance, type FastifyTestContext} from '@test/unit/test-utils/use-test-fastify-instance.js';
import {beforeEach, describe, expect, it, type TestAPI} from 'vitest';

describe('Json parser', () => {
  useTestFastifyInstance();

  beforeEach<FastifyTestContext>(context => {
    context.fastify.register(jsonParser);
    context.fastify.register(f => f.post('/test', context.routeHandlerMock));
  });

  (it as TestAPI<FastifyTestContext>).for(
    [
      {jsonStr: 'null', jsonObj: null},
      {jsonStr: 'false', jsonObj: false},
      {jsonStr: 'true', jsonObj: true},
      {jsonStr: '[null, false, true, [], {}, 1, "string"]', jsonObj: [null, false, true, [], {}, 1, 'string']},
      {jsonStr: '1', jsonObj: 1},
      {jsonStr: '"string"', jsonObj: 'string'},
      {
        name: 'object with many properties',
        jsonStr: '{ "a": null, "b": false, "c": true, "d": [1, 2, 3], "e": {}, "f": 1, "g": "string" }',
        jsonObj: {a: null, b: false, c: true, d: [1, 2, 3], e: {}, f: 1, g: 'string'},
      },
      {
        name: 'large nested object',
        jsonStr: `
      {
        "a": null,
        "b": false,
        "c": true,
        "d": [
          null,
          false,
          true,
          [null, false, true, [], {}, 1, "string"],
          { "a": null, "b": false, "c": true, "d": [], "e": {}, "f": 1, "g": "string"},
          1,
          "string"
        ],
        "e": { "a": null, "b": false, "c": true, "d": [], "e": {}, "f": 1, "g": "string"},
        "f": 1,
        "g": "string"
      }
      `,
        jsonObj: {
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
        },
      },
    ].map(obj => [obj.name ? obj.name : obj.jsonStr, obj] as [string, {jsonStr: string; jsonObj: object}]),
  )('accepts valid JSON objects: %s', async ([, {jsonStr, jsonObj}], {fastify, routeHandlerMock, errorHandlerMock}) => {
    await fastify.inject({
      method: 'POST',
      url: '/test',
      headers: {'content-type': 'application/json'},
      body: jsonStr,
    });

    expect(errorHandlerMock).not.toHaveBeenCalled();
    expect(routeHandlerMock).toHaveBeenCalledOnce();
    expect(routeHandlerMock.mock.calls[0][0].body).toEqual(jsonObj);
  });

  (it as TestAPI<FastifyTestContext>).for([
    '',
    'string',
    'undefined',
    '{ test: error }',
    '[,]',
    '{ "oops": "extra", "comma": "here", }',
  ])('rejects invalid JSON: %s', async (jsonStr, {fastify, routeHandlerMock, errorHandlerMock}) => {
    await fastify.inject({method: 'POST', url: '/test', headers: {'content-type': 'application/json'}, body: jsonStr});

    expect(routeHandlerMock).not.toHaveBeenCalled();
    expect(errorHandlerMock).toHaveBeenCalledOnce();
    expect(errorHandlerMock.mock.calls[0][0]).toBeInstanceOf(HTTP_ERRORS.BAD_REQUEST);
    expect(errorHandlerMock.mock.calls[0][0].requestErrors[0].key).toBe('/body');
  });
});
