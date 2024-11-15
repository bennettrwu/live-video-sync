import {AppFastifyInstance} from '@shared/types/fastify.js';
import {Type} from '@sinclair/typebox';
import {SHARED_REPLY_SCHEMA} from '@server/schemas.js';

export default async function healthRoute(fastify: AppFastifyInstance) {
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Admin'],
        response: {
          200: Type.Object({
            success: Type.Literal(true),
          }),
          400: SHARED_REPLY_SCHEMA[400],
          500: SHARED_REPLY_SCHEMA[500],
        },
      },
    },
    (req, reply) => {
      reply.code(200).send({success: true});
    },
  );
}
