import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';
import {TypeBoxValidatorCompiler, type TSchema} from '@fastify/type-provider-typebox';
import type {FastifyRouteSchemaDef} from 'fastify/types/schema.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {SetErrorFunction} from '@sinclair/typebox/errors';
import {APP_ERRORS} from '@shared/errors/app-errors.js';

// Custom schema validator to allow for custom error handling
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  SetErrorFunction(e => {
    if (e.schema.errorMessage && typeof e.schema.errorMessage === 'string') {
      return e.schema.errorMessage;
    }
    throw new APP_ERRORS.UNDEFINED_SCHEMA_ERROR_MESSAGE().causedBy(e);
  });

  fastify.setValidatorCompiler(schemaDef => {
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
