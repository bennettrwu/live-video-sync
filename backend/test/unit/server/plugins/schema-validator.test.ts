import schemaValidator from '@server/plugins/schema-validator.js';
import type {AppFastifyInstance} from '@shared/types/fastify.js';
import {Type} from '@sinclair/typebox';
import fakeConfig from '@test/unit/test-utils/fake-config.js';
import fakeLogger from '@test/unit/test-utils/fake-logger.js';
import {asValue, createContainer, type AwilixContainer} from 'awilix';
import Fastify from 'fastify';
import {beforeEach, describe, expect, it, vi, type Mock, type Mocked} from 'vitest';

interface LocalTestContext {
  container: AwilixContainer<Mocked<Dependencies>>;
  fastify: AppFastifyInstance;
  errorHandlerMock: Mock;
  routeHandlerMock: Mock;
}

describe('Schema validator', () => {
  const bodySchema = Type.Object(
    {
      any: Type.Any({errMsg: 'any'}),
      unknown: Type.Unknown({errMsg: 'unknown'}),
      string: Type.String({minLength: 1, errMsg: 'string'}),
      number: Type.Number({minimum: 1, errMsg: 'number'}),
      integer: Type.Integer({minimum: 1, errMsg: 'integer'}),
      boolean: Type.Boolean({errMsg: 'boolean'}),
      null: Type.Null({errMsg: 'null'}),
      literal: Type.Literal('literal', {errMsg: 'literal'}),
      array: Type.Array(Type.Number({minimum: 1, errMsg: 'arrayEle'}), {minItems: 1, errMsg: 'array'}),
      object: Type.Object({subprop: Type.Number({minimum: 1, errMsg: 'objectProp'})}, {errMsg: 'object'}),
      tuple: Type.Tuple(
        [Type.Number({minimum: 1, errMsg: 'tupleNum'}), Type.String({minLength: 1, errMsg: 'tupleString'})],
        {errMsg: 'tuple'},
      ),
      record: Type.Record(Type.String({pattern: '^[1-2]$'}), Type.String({minLength: 1, errMsg: 'recordStr'}), {
        errMsg: 'record',
        additionalProperties: false,
      }),
      partial: Type.Partial(Type.Object({num: Type.Number(), str: Type.String()}), {errMsg: 'partial'}),
      not: Type.Not(Type.Number({maximum: 10, errMsg: 'notNum'}), {errMsg: 'not'}),
    },
    {errMsg: 'msg'},
  );

  it.skip('', () => {});

  // beforeEach<LocalTestContext>(context => {
  //   context.container = createContainer();
  //   context.container.register({
  //     logger: asValue(fakeLogger()),
  //     config: asValue(fakeConfig({})),
  //   });
  //   context.fastify = Fastify();
  //   context.fastify.register(schemaValidator);

  //   context.errorHandlerMock = vi.fn().mockImplementation((e, req, res) => res.send());
  //   context.routeHandlerMock = vi.fn().mockImplementation((req, res) => res.send());

  //   context.fastify.setErrorHandler(context.errorHandlerMock);
  //   context.fastify.post('/body', {schema: {body: bodySchema}}, context.routeHandlerMock);
  // });

  // it<LocalTestContext>('accepts valid body schema', async ({fastify, routeHandlerMock}) => {
  //   const body = {
  //     any: 'idk',
  //     unknown: 1,
  //     string: 's',
  //     number: 1.5,
  //     integer: 1,
  //     boolean: true,
  //     null: null,
  //     literal: 'literal',
  //     array: [1],
  //     object: {subprop: 1},
  //     tuple: [1, 's'],
  //     record: {'1': 's'},
  //     partial: {},
  //     not: 11,
  //   };

  //   await fastify.inject({method: 'POST', url: '/body', body});

  //   expect(routeHandlerMock).toHaveBeenCalledOnce();
  //   expect(routeHandlerMock.mock.calls[0][0].body).toEqual(body);
  // });
});
