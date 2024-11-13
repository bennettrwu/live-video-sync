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
        maxLength: 256,
        errorMessage: 'Username must be between 1 and 256 characters long.',
      }),
      password: Type.String({
        minLength: 8,
        maxLength: 256,
        errorMessage: 'Password must be between 8 and 256 characters long.',
      }),
    },
    {description: 'User credentials'},
  ),
  response: {
    200: Type.Object(
      {
        success: Type.Literal(true),
      },
      {description: 'Successfully logged into account'},
    ),
    ...SHARED_REPLY_SCHEMA,
  },
};

function errorHandler(error: Error) {
  if (error instanceof APP_ERRORS.USERNAME_NOT_FOUND || error instanceof APP_ERRORS.INVALID_ACCOUNT_CREDENTIALS) {
    throw new HTTP_ERRORS.UNAUTHORIZED('Username and/or password did not match').causedBy(error);
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

  return reply.code(200).send({success: true});
}
