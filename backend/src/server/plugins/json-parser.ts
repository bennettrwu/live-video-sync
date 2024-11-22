import fastifyPlugin from 'fastify-plugin';
import {AppFastifyInstance} from '@shared/types/fastify.js';
import {errorTupleFunction as etf} from '@shared/utils/errorTuple.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';

// Custom application/json parser to allow custom error handling
export default fastifyPlugin((fastify: AppFastifyInstance) => {
  fastify.addContentTypeParser('application/json', {parseAs: 'buffer'}, (request, body, done) => {
    const [parsedRes, parseErr] = etf((b: Buffer | string) => {
      return JSON.parse(b.toString());
    }, body);

    if (parseErr) {
      return done(new HTTP_ERRORS.BAD_REQUEST([{message: 'Invalid JSON found in request body.', key: '/body'}]));
    }
    done(null, parsedRes);
  });
});
