import {Type} from '@sinclair/typebox';
import {AppFastifyReply, AppFastifyRequest} from '@shared/types/fastify.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {SHARED_REPLY_SCHEMA} from '@server/schemas.js';
import {errorTuplePromise as etp} from '@shared/utils/errorTuple.js';

export const LOGIN_ACCOUNT_SCHEMA = {
  description: 'Login to an existing user account',
  tags: ['Accounts'],
  body: Type.Object(
    {
      username: Type.String({
        minLength: 1,
        maxLength: 16,
        errMsg: 'Username must be between 1 and 16 characters long and should not contain any whitespace.',
      }),
      password: Type.String({
        minLength: 8,
        maxLength: 256,
        errMsg: 'Password must be between 8 and 256 characters long.',
      }),
    },
    {description: 'User credentials', errMsg: 'Request must supply username and password.'},
  ),
  response: {
    200: Type.Object(
      {
        statusCode: Type.Literal(200),
        success: Type.Literal(true),
        requestId: Type.String(),
      },
      {description: 'Successfully logged into account'},
    ),
    400: SHARED_REPLY_SCHEMA[400],
    401: SHARED_REPLY_SCHEMA[401],
    500: SHARED_REPLY_SCHEMA[500],
  },
};

function errorHandler(error: Error) {
  if (error instanceof APP_ERRORS.USERNAME_NOT_FOUND || error instanceof APP_ERRORS.INVALID_ACCOUNT_CREDENTIALS) {
    throw new HTTP_ERRORS.UNAUTHORIZED('Username and/or password did not match any accounts on record.').causedBy(
      error,
    );
  }

  throw new HTTP_ERRORS.INTERNAL_SERVER_ERROR(
    'Something went wrong on our end logging you into your account. Please try again later.',
  ).causedBy(error);
}

export async function loginAccountHandler(
  req: AppFastifyRequest<typeof LOGIN_ACCOUNT_SCHEMA>,
  reply: AppFastifyReply<typeof LOGIN_ACCOUNT_SCHEMA>,
) {
  const {username, password} = req.body;

  const accountsService = req.diScope.resolve('accountsService');
  const sessionService = req.diScope.resolve('sessionService');

  const [userId, validateErr] = await etp(accountsService.validateAccountCredentials(username, password));
  if (validateErr) return errorHandler(validateErr);

  const [session, newSessionErr] = await etp(sessionService.createNewSession(userId));
  if (newSessionErr) return errorHandler(newSessionErr);

  reply.setCookie('sessionToken', session.token, {
    expires: session?.expires,
    signed: true,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });

  return reply.code(200).send({statusCode: 200, success: true, requestId: req.id});
}
