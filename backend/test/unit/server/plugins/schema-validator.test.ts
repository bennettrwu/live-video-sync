import schemaValidator, {validateSchemaFormat} from '@server/plugins/schema-validator.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import type {AppFastifyInstance} from '@shared/types/fastify.js';
import {Type} from '@sinclair/typebox';
import formatTestNames from '@test/unit/test-utils/format-test-names.js';
import {createContainer, type AwilixContainer} from 'awilix';
import Fastify from 'fastify';
import {beforeEach, describe, expect, vi, type Mock, type Mocked} from 'vitest';

interface LocalTestContext {
  container: AwilixContainer<Mocked<Dependencies>>;
  fastify: AppFastifyInstance;
  errorHandlerMock: Mock;
  routeHandlerMock: Mock;
}

describe('Schema validator', () => {
  const schemas = {
    any: Type.Any({errMsg: 'any'}),
    unknown: Type.Unknown({errMsg: 'unknown'}),
    string: Type.String({minLength: 1, errMsg: 'string'}),
    number: Type.Number({minimum: 1, errMsg: 'number'}),
    integer: Type.Integer({minimum: 1, errMsg: 'integer'}),
    boolean: Type.Boolean({errMsg: 'boolean'}),
    null: Type.Null({errMsg: 'null'}),
    literal: Type.Literal('literal', {errMsg: 'literal'}),
    array: Type.Array(Type.Number({minimum: 1, errMsg: 'arrayEle'}), {minItems: 1, errMsg: 'array'}),
    object: Type.Object(
      {subprop: Type.Number({minimum: 1, errMsg: 'objectProp'})},
      {additionalProperties: false, errMsg: 'object'},
    ),
    tuple: Type.Tuple(
      [Type.Number({minimum: 1, errMsg: 'tupleNum'}), Type.String({minLength: 1, errMsg: 'tupleStr'})],
      {errMsg: 'tuple'},
    ),
    record: Type.Record(Type.String({pattern: '^[1-9]$'}), Type.String({minLength: 1, errMsg: 'recordStr'}), {
      errMsg: 'record',
      minProperties: 1,
      additionalProperties: false,
    }),
    partial: Type.Partial(
      Type.Object(
        {num: Type.Number({errMsg: 'partialNum'}), str: Type.String({errMsg: 'partialStr'})},
        {additionalProperties: false},
      ),
      {
        errMsg: 'partial',
      },
    ),
    not: Type.Not(Type.Number({maximum: 10, errMsg: 'notNum'}), {errMsg: 'not'}),
    intersect: Type.Intersect(
      [
        Type.Object({num: Type.Number({errMsg: 'intersectNum'})}, {errMsg: 'intersectFirst'}),
        Type.Object({str: Type.String({errMsg: 'intersectStr'})}, {errMsg: 'intersectSecond'}),
      ],
      {errMsg: 'intersect'},
    ),
    union: Type.Union(
      [
        Type.Object({num: Type.Number({errMsg: 'unionNum'})}, {errMsg: 'unionFirst'}),
        Type.Object({str: Type.String({errMsg: 'unionStr'})}, {errMsg: 'unionSecond'}),
      ],
      {
        errMsg: 'union',
      },
    ),
  };
  const valid = {
    any: 'idk',
    unknown: 1,
    string: 's',
    number: 1.5,
    integer: 1,
    boolean: true,
    null: null,
    literal: 'literal',
    array: [1],
    object: {subprop: 1},
    tuple: [1, 's'],
    record: {'1': 's'},
    partial: {},
    not: 11,
    intersect: {num: 1, str: 's'},
    union: {num: 1},
  };

  beforeEach<LocalTestContext>(context => {
    context.container = createContainer();
    context.fastify = Fastify();
    context.fastify.register(schemaValidator);

    context.errorHandlerMock = vi.fn().mockImplementation((e, req, res) => res.send());
    context.routeHandlerMock = vi.fn().mockImplementation((req, res) => res.send());

    context.fastify.setErrorHandler(context.errorHandlerMock);
  });

  describe<LocalTestContext>('schema error message validation', it => {
    it.for(
      formatTestNames([
        {name: 'any', schema: Type.Any()},
        {name: 'string', schema: Type.String({minLength: 1, maxLength: 10})},
        {name: 'pattern', schema: Type.String({pattern: '^a$'})},
        {name: 'number', schema: Type.Number({multipleOf: 5, minimum: 10})},
        {name: 'object', schema: Type.Object({})},
        {name: 'record', schema: Type.Record(Type.String({pattern: '^[0-1]$'}), Type.Number({errMsg: ''}))},
        {name: 'array', schema: Type.Array(Type.Number({errMsg: ''}))},
        {name: 'tuple', schema: Type.Tuple([Type.Number({errMsg: ''})])},
        {
          name: 'intersect',
          schema: Type.Intersect([
            Type.Object({a: Type.String({errMsg: ''})}, {errMsg: ''}),
            Type.Object({b: Type.String({errMsg: ''})}, {errMsg: ''}),
          ]),
        },
        {
          name: 'union',
          schema: Type.Union([
            Type.Object({a: Type.String({errMsg: ''})}, {errMsg: ''}),
            Type.Object({b: Type.String({errMsg: ''})}, {errMsg: ''}),
          ]),
        },
        {name: 'not', schema: Type.Not(Type.Number({errMsg: ''}))},
        {name: 'object subproperty', schema: Type.Object({subprop: Type.String()}, {errMsg: ''})},
        {
          name: 'nested object subproperty',
          schema: Type.Object(
            {
              subprop0: Type.String({errMsg: '123'}),
              subprop1: Type.Object({nest0: Type.Any({errMsg: ''}), nest1: Type.Number({errMsg: ''})}, {errMsg: ''}),
              subprop2: Type.Object({nest0: Type.Literal(1, {errMsg: ''})}, {errMsg: ''}),
              subprop3: Type.Object(
                {nest0: Type.Integer({errMsg: ''}), nest1: Type.Literal(1), nest2: Type.String({errMsg: ''})},
                {errMsg: ''},
              ),
            },
            {errMsg: ''},
          ),
        },
        {name: 'record value', schema: Type.Record(Type.String({pattern: '^[0-1]$'}), Type.Number(), {errMsg: ''})},
        {name: 'array element', schema: Type.Array(Type.Number(), {errMsg: ''})},
        {
          name: 'tuple element types',
          schema: Type.Tuple([Type.Number({errMsg: ''}), Type.String()], {errMsg: ''}),
        },
        {
          name: 'intersect subproperty',
          schema: Type.Intersect(
            [Type.Object({a: Type.String({errMsg: ''})}, {errMsg: ''}), Type.Object({b: Type.String()}, {errMsg: ''})],
            {errMsg: ''},
          ),
        },
        {
          name: 'union subproperty',
          schema: Type.Union(
            [Type.Object({a: Type.String({errMsg: ''})}, {errMsg: ''}), Type.Object({b: Type.String()}, {errMsg: ''})],
            {errMsg: ''},
          ),
        },
        {
          name: 'not subschema',
          schema: Type.Not(Type.String(), {errMsg: ''}),
        },
        {
          name: 'complex schema 1',
          schema: Type.Object(
            {
              array: Type.Array(
                Type.Object(
                  {
                    not: Type.Not(Type.String({errMsg: ''}), {errMsg: ''}),
                  },
                  {errMsg: ''},
                ),
                {
                  errMsg: undefined,
                },
              ),
              tuple: Type.Tuple(
                [
                  Type.Intersect(
                    [
                      Type.Object(
                        {a: Type.Record(Type.String(), Type.Number({errMsg: ''}), {errMsg: ''})},
                        {errMsg: ''},
                      ),
                      Type.Object({b: Type.Object({}, {errMsg: ''})}, {errMsg: ''}),
                    ],
                    {errMsg: ''},
                  ),
                  Type.Union(
                    [
                      Type.Object(
                        {a: Type.Not(Type.Not(Type.String({errMsg: ''}), {errMsg: ''}), {errMsg: ''})},
                        {errMsg: ''},
                      ),
                      Type.Object({b: Type.Boolean({errMsg: ''})}, {errMsg: ''}),
                    ],
                    {errMsg: ''},
                  ),
                ],
                {errMsg: ''},
              ),
            },
            {errMsg: ''},
          ),
        },
        {
          name: 'complex schema 2',
          schema: Type.Object(
            {
              array: Type.Array(
                Type.Object(
                  {
                    not: Type.Not(Type.String({errMsg: ''}), {errMsg: ''}),
                  },
                  {errMsg: ''},
                ),
                {
                  errMsg: '',
                },
              ),
              tuple: Type.Tuple(
                [
                  Type.Intersect(
                    [
                      Type.Object(
                        {a: Type.Record(Type.String(), Type.Number({errMsg: undefined}), {errMsg: ''})},
                        {errMsg: ''},
                      ),
                      Type.Object({b: Type.Object({}, {errMsg: ''})}, {errMsg: ''}),
                    ],
                    {errMsg: ''},
                  ),
                  Type.Union(
                    [
                      Type.Object(
                        {a: Type.Not(Type.Not(Type.String({errMsg: ''}), {errMsg: ''}), {errMsg: ''})},
                        {errMsg: ''},
                      ),
                      Type.Object({b: Type.Boolean({errMsg: ''})}, {errMsg: ''}),
                    ],
                    {errMsg: ''},
                  ),
                ],
                {errMsg: ''},
              ),
            },
            {errMsg: ''},
          ),
        },
        {
          name: 'complex schema 3',
          schema: Type.Object(
            {
              array: Type.Array(
                Type.Object(
                  {
                    not: Type.Not(Type.String({errMsg: ''}), {errMsg: ''}),
                  },
                  {errMsg: ''},
                ),
                {
                  errMsg: '',
                },
              ),
              tuple: Type.Tuple(
                [
                  Type.Intersect(
                    [
                      Type.Object(
                        {a: Type.Record(Type.String(), Type.Number({errMsg: ''}), {errMsg: ''})},
                        {errMsg: ''},
                      ),
                      Type.Object({b: Type.Object({}, {errMsg: ''})}, {errMsg: ''}),
                    ],
                    {errMsg: ''},
                  ),
                  Type.Union(
                    [
                      Type.Object(
                        {a: Type.Not(Type.Not(Type.String({errMsg: undefined}), {errMsg: ''}), {errMsg: ''})},
                        {errMsg: ''},
                      ),
                      Type.Object({b: Type.Boolean({errMsg: ''})}, {errMsg: ''}),
                    ],
                    {errMsg: ''},
                  ),
                ],
                {errMsg: ''},
              ),
            },
            {errMsg: ''},
          ),
        },
      ]),
    )('rejects if error message is not defined for: %s', ([, {schema}]) => {
      expect(() => validateSchemaFormat(schema)).toThrow(APP_ERRORS.UNDEFINED_SCHEMA_ERROR_MESSAGE);
    });
  });

  describe<LocalTestContext>('body validation', it => {
    it.for(
      formatTestNames([
        {name: 'any', schema: schemas.any, body: '"idk"', expected: 'idk'},
        {name: 'unknown', schema: schemas.unknown, body: '1', expected: 1},
        {name: 'string', schema: schemas.string, body: '"string"', expected: 'string'},
        {name: 'number', schema: schemas.number, body: '1.5', expected: 1.5},
        {name: 'integer', schema: schemas.integer, body: '1', expected: 1},
        {name: 'boolean', schema: schemas.boolean, body: 'false', expected: false},
        {name: 'null', schema: schemas.null, body: 'null', expected: null},
        {name: 'literal', schema: schemas.literal, body: '"literal"', expected: 'literal'},
        {name: 'array', schema: schemas.array, body: '[1]', expected: [1]},
        {name: 'object', schema: schemas.object, body: '{"subprop": 1}', expected: {subprop: 1}},
        {name: 'tuple', schema: schemas.tuple, body: '[1, "s"]', expected: [1, 's']},
        {name: 'record', schema: schemas.record, body: '{"1": "s"}', expected: {1: 's'}},
        {name: 'partial without props', schema: schemas.partial, body: '{}', expected: {}},
        {
          name: 'partial with props',
          schema: schemas.partial,
          body: '{"num": 1,"str": "str"}',
          expected: {num: 1, str: 'str'},
        },
        {name: 'not', schema: schemas.not, body: '11', expected: 11},
        {name: 'intersect', schema: schemas.intersect, body: '{"num": 1, "str": "s"}', expected: {num: 1, str: 's'}},
        {name: 'union num', schema: schemas.union, body: '{"num": 1}', expected: {num: 1}},
        {name: 'union str', schema: schemas.union, body: '{"str": "s"}', expected: {str: 's'}},
        {name: 'union both', schema: schemas.union, body: '{"num": 1, "str": "s"}', expected: {num: 1, str: 's'}},
        {
          name: 'large object',
          schema: Type.Object(schemas, {errMsg: 'body'}),
          body: JSON.stringify(valid),
          expected: valid,
        },
      ]),
    )('accepts valid body: %s', async ([, {schema, body, expected}], {fastify, routeHandlerMock}) => {
      fastify.post('/body', {schema: {body: schema}}, routeHandlerMock);

      await fastify.inject({method: 'POST', url: '/body', body, headers: {'content-type': 'application/json'}});

      expect(routeHandlerMock.mock.calls[0][0].body).toEqual(expected);
    });

    it.for(
      formatTestNames([
        {
          name: 'wrong type string/integer',
          schema: schemas.string,
          body: '1',
          errs: [{message: 'string', key: '/body'}],
        },
        {name: 'wrong type null/integer', schema: schemas.null, body: '1', errs: [{message: 'null', key: '/body'}]},
        {
          name: 'wrong type integer/number',
          schema: schemas.integer,
          body: '1.5',
          errs: [{message: 'integer', key: '/body'}],
        },
        {
          name: 'wrong type integer/string',
          schema: schemas.integer,
          body: '"asdf"',
          errs: [{message: 'integer', key: '/body'}],
        },
        {
          name: 'wrong type boolean/string',
          schema: schemas.boolean,
          body: '"false"',
          errs: [{message: 'boolean', key: '/body'}],
        },
        {name: 'string', schema: schemas.string, body: '""', errs: [{message: 'string', key: '/body'}]},
        {name: 'number', schema: schemas.number, body: '0', errs: [{message: 'number', key: '/body'}]},
        {name: 'integer', schema: schemas.integer, body: '0', errs: [{message: 'integer', key: '/body'}]},
        {name: 'literal', schema: schemas.literal, body: '"hi"', errs: [{message: 'literal', key: '/body'}]},
        {name: 'array element', schema: schemas.array, body: '["s"]', errs: [{message: 'arrayEle', key: '/body/0'}]},
        {
          name: 'object property',
          schema: schemas.object,
          body: '{"subprop": 0}',
          errs: [{message: 'objectProp', key: '/body/subprop'}],
        },
        {
          name: 'object extra property',
          schema: schemas.object,
          body: '{"subprop": 1, "extra": 1}',
          errs: [{message: 'object', key: '/body/extra'}],
        },
        {name: 'tuple first', schema: schemas.tuple, body: '[0,"s"]', errs: [{message: 'tupleNum', key: '/body/0'}]},
        {name: 'tuple second', schema: schemas.tuple, body: '[1,""]', errs: [{message: 'tupleStr', key: '/body/1'}]},
        {name: 'tuple', schema: schemas.tuple, body: '[0]', errs: [{message: 'tuple', key: '/body'}]},
        {name: 'record key', schema: schemas.record, body: '{"0": "s"}', errs: [{message: 'record', key: '/body/0'}]},
        {name: 'record val', schema: schemas.record, body: '{"1": ""}', errs: [{message: 'recordStr', key: '/body/1'}]},
        {name: 'record', schema: schemas.record, body: '{}', errs: [{message: 'record', key: '/body'}]},
        {
          name: 'partial',
          schema: schemas.partial,
          body: '{"extra": 1}',
          errs: [{message: 'partial', key: '/body/extra'}],
        },
        {
          name: 'partial num',
          schema: schemas.partial,
          body: '{"num": "str"}',
          errs: [{message: 'partialNum', key: '/body/num'}],
        },
        {
          name: 'partial str',
          schema: schemas.partial,
          body: '{"num": 1, "str": 1}',
          errs: [{message: 'partialStr', key: '/body/str'}],
        },
        {name: 'not', schema: schemas.not, body: '10', errs: [{message: 'not', key: '/body'}]},
        {
          name: 'intersect',
          schema: schemas.intersect,
          body: '{"num": "s"}',
          errs: [
            {message: 'intersectNum', key: '/body/num'},
            {message: 'intersectStr', key: '/body/str'},
            {message: 'intersect', key: '/body'},
          ],
        },
        {
          name: 'union num',
          schema: schemas.union,
          body: '{"num": "s"}',
          errs: [{message: 'union', key: '/body'}],
        },
        {
          name: 'union',
          schema: schemas.union,
          body: '{}',
          errs: [{message: 'union', key: '/body'}],
        },
        {
          name: 'list errors',
          schema: Type.Object(schemas, {errMsg: 'body'}),
          body: '{"array": [1, 2, "s"], "object": { }, "tuple": [0, 1], "record": { "1": "", "0": "" }, "intersect": {"num": "s"} }',
          errs: [
            {message: 'any', key: '/body/any'},
            {message: 'unknown', key: '/body/unknown'},
            {message: 'string', key: '/body/string'},
            {message: 'number', key: '/body/number'},
            {message: 'integer', key: '/body/integer'},
            {message: 'boolean', key: '/body/boolean'},
            {message: 'null', key: '/body/null'},
            {message: 'literal', key: '/body/literal'},
            {message: 'arrayEle', key: '/body/array/2'},
            {message: 'objectProp', key: '/body/object/subprop'},
            {message: 'tupleNum', key: '/body/tuple/0'},
            {message: 'tupleStr', key: '/body/tuple/1'},
            {message: 'record', key: '/body/record/0'},
            {message: 'recordStr', key: '/body/record/1'},
            {message: 'partial', key: '/body/partial'},
            {message: 'not', key: '/body/not'},
            {message: 'intersectNum', key: '/body/intersect/num'},
            {message: 'intersectStr', key: '/body/intersect/str'},
            {message: 'intersect', key: '/body/intersect'},
            {message: 'union', key: '/body/union'},
          ],
        },
      ]),
    )('rejects invalid body: %s', async ([, {schema, body, errs}], {fastify, errorHandlerMock, routeHandlerMock}) => {
      fastify.post('/body', {schema: {body: schema}}, routeHandlerMock);

      await fastify.inject({method: 'POST', url: '/body', body, headers: {'content-type': 'application/json'}});

      expect(routeHandlerMock).not.toHaveBeenCalled();
      expect(errorHandlerMock.mock.calls[0][0]).toBeInstanceOf(HTTP_ERRORS.BAD_REQUEST);

      expect(errorHandlerMock.mock.calls[0][0].requestErrors).toEqual(expect.arrayContaining(errs));
      expect(errs).toEqual(expect.arrayContaining(errorHandlerMock.mock.calls[0][0].requestErrors));
    });
  });

  describe<LocalTestContext>('header validation', it => {
    it.skip('', () => {});
  });
});
