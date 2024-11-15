import {Type} from '@sinclair/typebox';
import {AppFastifyReply, AppFastifyRequest} from '@shared/types/fastify.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {SHARED_REPLY_SCHEMA} from '@server/schemas.js';
import {errorTuplePromise as etp} from '@shared/utils/errorTuple.js';

export const LOGOUT_ACCOUNT_SCHEMA = {
  description: 'Login to an existing user account',
  tags: ['Accounts'],
  response: {
    200: Type.Object(
      {
        statusCode: Type.Literal(200),
        success: Type.Literal(true),
      },
      {description: 'Successfully logged out of account'},
    ),
    400: SHARED_REPLY_SCHEMA['400'],
    450: SHARED_REPLY_SCHEMA['500'],
  },
};

function errorHandler(error: Error) {
  throw new HTTP_ERRORS.INTERNAL_SERVER_ERROR(
    'Something went wrong on our end logging you out. Please try again later.',
  ).causedBy(error);
}

export async function logoutAccountHandler(
  req: AppFastifyRequest<typeof LOGOUT_ACCOUNT_SCHEMA>,
  reply: AppFastifyReply<typeof LOGOUT_ACCOUNT_SCHEMA>,
) {
  const sessionService = req.diScope.resolve('sessionService');

  const sessionCookie = req.cookies['sessionToken'];
  if (sessionCookie === undefined) return reply.code(200).send({statusCode: 200, success: true});

  const {valid, value: sessionToken} = req.unsignCookie(sessionCookie);
  if (!valid) return reply.code(200).send({statusCode: 200, success: true});

  const [, deleteErr] = await etp(sessionService.invalidateUserSession(sessionToken));
  if (deleteErr) return errorHandler(deleteErr);

  reply.setCookie('sessionToken', '', {
    expires: new Date(0),
    signed: true,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });

  return reply.code(200).send({statusCode: 200, success: true});
}
