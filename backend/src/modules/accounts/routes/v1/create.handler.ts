import {Type} from '@sinclair/typebox';
import {AppFastifyReply, AppFastifyRequest} from '@shared/types/fastify.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {SHARED_REPLY_SCHEMA} from '@server/schemas.js';
import {errorTupleFunction as etf, errorTuplePromise as etp} from '@shared/utils/errorTuple.js';

export const CREATE_ACCOUNT_SCHEMA = {
  description: 'Create a new user account',
  tags: ['Accounts'],
  body: Type.Object(
    {
      username: Type.String({
        minLength: 1,
        maxLength: 16,
        errMsg: 'Username must be between 1 and 16 characters long.',
      }),
      password: Type.String({
        minLength: 8,
        maxLength: 256,
        errMsg: 'Password must be between 8 and 256 characters long.',
      }),
    },
    {description: 'New user account credentials', errMsg: 'Request must supply username and password.'},
  ),
  response: {
    201: Type.Object(
      {
        statusCode: Type.Literal(201),
        success: Type.Literal(true),
        requestId: Type.String(),
      },
      {description: 'Successfully created account'},
    ),
    400: SHARED_REPLY_SCHEMA[400],
    500: SHARED_REPLY_SCHEMA[500],
  },
};

function errorHandler(error: Error) {
  if (error instanceof APP_ERRORS.INVALID_USERNAME) {
    throw new HTTP_ERRORS.BAD_REQUEST([{message: error.message, key: '/body/username'}]);
  }

  if (error instanceof APP_ERRORS.DUPLICATE_USERNAME) {
    throw new HTTP_ERRORS.BAD_REQUEST([
      {message: 'An account with given username already exists.', key: '/body/username'},
    ]).causedBy(error);
  }

  throw new HTTP_ERRORS.INTERNAL_SERVER_ERROR(
    'Something went wrong on our end creating your account. Please try again later.',
  ).causedBy(error);
}

export async function createAccountHandler(
  req: AppFastifyRequest<typeof CREATE_ACCOUNT_SCHEMA>,
  reply: AppFastifyReply<typeof CREATE_ACCOUNT_SCHEMA>,
) {
  const {username, password} = req.body;

  const accountsService = req.diScope.resolve('accountsService');
  const sessionService = req.diScope.resolve('sessionService');

  const [, validErr] = etf(accountsService.isValidUsername, username);
  if (validErr) return errorHandler(validErr);

  const [account, createErr] = await etp(accountsService.createNewAccount(username, password));
  if (createErr) return errorHandler(createErr);

  const [session, newSessionErr] = await etp(sessionService.createNewSession(account.userId));
  if (newSessionErr) return errorHandler(newSessionErr);

  reply.setCookie('sessionToken', session.token, {
    expires: session.expires,
    signed: true,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });

  return reply.code(201).send({success: true, statusCode: 201, requestId: req.id});
}
