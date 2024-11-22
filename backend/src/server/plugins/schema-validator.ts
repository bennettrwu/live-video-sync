import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';
import {TypeBoxValidatorCompiler, type TSchema} from '@fastify/type-provider-typebox';
import type {FastifyRouteSchemaDef} from 'fastify/types/schema.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {SetErrorFunction} from '@sinclair/typebox/errors';
import {APP_ERRORS} from '@shared/errors/app-errors.js';

/**
 * Checks if a given typebox schema contains errMsg recursively
 * @throws {APP_ERRORS.UNDEFINED_SCHEMA_ERROR_MESSAGE}
 * @param schema
 */
export function validateSchemaFormat(schema: TSchema) {
  if (typeof schema.errMsg !== 'string') {
    throw new APP_ERRORS.UNDEFINED_SCHEMA_ERROR_MESSAGE().causedBy(schema);
  }

  if (schema.type === 'object') {
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        validateSchemaFormat(schema.properties[key]);
      }
    }

    if (schema.patternProperties) {
      for (const key of Object.keys(schema.patternProperties)) {
        validateSchemaFormat(schema.patternProperties[key]);
      }
    }
  }

  if (schema.type === 'array') {
    if (Array.isArray(schema.items)) {
      for (const s of schema.items) {
        validateSchemaFormat(s);
      }
    } else {
      validateSchemaFormat(schema.items);
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const s of schema.allOf) {
      validateSchemaFormat(s);
    }
  }

  if (Array.isArray(schema.anyOf)) {
    for (const s of schema.anyOf) {
      validateSchemaFormat(s);
    }
  }

  if (schema.not) {
    validateSchemaFormat(schema.not);
  }
}

// Custom schema validator to allow for custom error handling
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  SetErrorFunction(e => e.schema.errMsg);

  fastify.setValidatorCompiler(schemaDef => {
    validateSchemaFormat(schemaDef.schema as TSchema);
    const validator = TypeBoxValidatorCompiler(schemaDef as FastifyRouteSchemaDef<TSchema>);

    return (...args) => {
      const result = validator(...args) as unknown as {
        value: unknown;
        error: Array<{message: string; instancePath: string}>;
      };

      if (result.error) {
        return {
          error: new HTTP_ERRORS.BAD_REQUEST(
            result.error.map(({message, instancePath}) => {
              return {message, key: `/${schemaDef.httpPart}${instancePath}`};
            }),
          ),
        };
      }

      return {value: result.value};
    };
  });
});
