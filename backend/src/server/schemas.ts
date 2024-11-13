import {Type} from '@sinclair/typebox';

// Shared fastify route schemas

export const SHARED_REPLY_SCHEMA = {
  400: Type.Object(
    {
      success: Type.Literal(false),
      statusCode: Type.Literal(400),
      requestErrors: Type.Array(
        Type.Object({
          message: Type.String(),
          key: Type.String({default: '/body/some/nested/object/property'}),
        }),
      ),
      requestId: Type.String(),
    },
    {
      description:
        'Response when request was invalid. Each validation error has a user facing message about the error. Keys start with the part of request that had error ("/body", "/headers", "/params", "/querystring"). Key can also be "nonOperational" to indicate non operational errors that require bug fix.',
    },
  ),
  401: Type.Object(
    {
      success: Type.Literal(false),
      statusCode: Type.Literal(401),
      message: Type.String(),
      requestId: Type.String(),
    },
    {
      description:
        'Response when request did not have valid session token. Message will contain user facing reason why.',
    },
  ),
  403: Type.Object(
    {
      success: Type.Literal(false),
      statusCode: Type.Literal(403),
      message: Type.String(),
      requestId: Type.String(),
    },
    {
      description:
        'Response when request had valid session token but account was not allow to access the resource. Message will contain user facing reason why.',
    },
  ),
  500: Type.Object(
    {
      success: Type.Literal(false),
      statusCode: Type.Literal(500),
      message: Type.String(),
      requestId: Type.String(),
    },
    {
      description: 'Response when server encounters an unexpected error. Message will contain user facing reason why.',
    },
  ),
};
