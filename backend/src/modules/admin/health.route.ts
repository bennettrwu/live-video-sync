import {AppFastifyInstance} from '@shared/types/fastify.js';
import {Type} from '@sinclair/typebox';
import {SHARED_REPLY_SCHEMA} from '@server/schemas.js';

export default async function healthRoute(fastify: AppFastifyInstance) {
  fastify.get(
    '/admin/v1/health',
    {
      schema: {
        tags: ['Admin'],
        response: {
          200: Type.Object({
            statusCode: Type.Literal(200),
            success: Type.Literal(true),
          }),
          400: SHARED_REPLY_SCHEMA[400],
          500: SHARED_REPLY_SCHEMA[500],
        },
      },
    },
    (req, reply) => {
      reply.code(200).send({statusCode: 200, success: true});
    },
  );
}
