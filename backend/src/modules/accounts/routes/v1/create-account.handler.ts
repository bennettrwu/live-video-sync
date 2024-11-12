import {Type} from '@sinclair/typebox';
import {AppFastifyReply, AppFastifyRequest} from '@shared/types/fastify.js';
import {APP_ERRORS} from '@shared/errors/app-errors.js';
import {HTTP_ERRORS} from '@shared/errors/http-errors.js';
import {SHARED_REPLY_SCHEMA} from '@server/schemas.js';
import {errorTuplePromise as etp} from '@shared/utils/errorTuple.js';

export const CREATE_ACCOUNT_SCHEMA = {
  description: 'Create a new user account',
  tags: ['Accounts'],
  body: Type.Object(
    {
      username: Type.String({minLength: 1, maxLength: 256}),
      password: Type.String({minLength: 1, maxLength: 256}),
    },
    {description: 'New user account credentials'},
  ),
  response: {
    201: Type.Object(
      {
        success: Type.Literal(true),
      },
      {description: 'Successfully created account'},
    ),
    ...SHARED_REPLY_SCHEMA,
  },
};

function errorHandler(error: Error) {
  if (error instanceof APP_ERRORS.DUPLICATE_USERNAME) {
    throw new HTTP_ERRORS.BAD_REQUEST('An account with given username already exists.').causedBy(error);
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

  return reply.code(201).send({success: true});
}
