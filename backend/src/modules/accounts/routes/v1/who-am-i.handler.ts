import {Type} from '@sinclair/typebox';
import {AppFastifyReply, AppFastifyRequest} from '@shared/types/fastify.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {SHARED_REPLY_SCHEMA} from '@server/schemas.js';
import {errorTuplePromise as etp} from '@shared/utils/errorTuple.js';

export const WHO_AM_I_ACCOUNT_SCHEMA = {
  description: 'Login to an existing user account',
  tags: ['Accounts'],
  security: [{sessionToken: []}],
  response: {
    200: Type.Object(
      {
        statusCode: Type.Literal(200),
        success: Type.Literal(true),
        username: Type.String(),
      },
      {description: 'Account username of session'},
    ),
    400: SHARED_REPLY_SCHEMA[400],
    401: SHARED_REPLY_SCHEMA[401],
    500: SHARED_REPLY_SCHEMA[500],
  },
};

function errorHandler(error: Error) {
  if (error instanceof APP_ERRORS.USER_ID_NOT_FOUND) {
    throw new HTTP_ERRORS.UNAUTHORIZED('Account not found, are you logged in?').causedBy(error);
  }

  throw new HTTP_ERRORS.INTERNAL_SERVER_ERROR(
    'Something went wrong on our end creating your account. Please try again later.',
  ).causedBy(error);
}

export async function whoAmIAccountHandler(
  req: AppFastifyRequest<typeof WHO_AM_I_ACCOUNT_SCHEMA>,
  reply: AppFastifyReply<typeof WHO_AM_I_ACCOUNT_SCHEMA>,
) {
  const accountsRepository = req.diScope.resolve('accountsRepository');

  const [account, getErr] = await etp(accountsRepository.getAccountUserId(req.getUserId()));
  if (getErr) return errorHandler(getErr);

  return reply.code(200).send({statusCode: 200, success: true, username: account.username});
}
