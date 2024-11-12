import {Type} from '@sinclair/typebox';

// Shared fastify route schemas

export const SHARED_REPLY_SCHEMA = {
  '4xx': Type.Object(
    {
      success: Type.Literal(false),
      statusCode: Type.Number({default: 400}),
      message: Type.String(),
      requestId: Type.String(),
    },
    {
      description:
        'Response when request had a client error. Message will contain user facing reason why.',
    },
  ),
  500: Type.Object(
    {
      success: Type.Literal(false),
      message: Type.Literal(500),
      requestId: Type.String(),
    },
    {
      description:
        'Response when server encounters an unexpected error. Message will contain user facing reason why.',
    },
  ),
};
