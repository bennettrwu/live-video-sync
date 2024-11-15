import {AppFastifyInstance} from '@shared/types/fastify.js';
import {createAccountHandler, CREATE_ACCOUNT_SCHEMA} from './v1/create.handler.js';
import {LOGIN_ACCOUNT_SCHEMA, loginAccountHandler} from './v1/login.handler.js';
import {WHO_AM_I_ACCOUNT_SCHEMA, whoAmIAccountHandler} from './v1/who-am-i.handler.js';
import {LOGOUT_ACCOUNT_SCHEMA, logoutAccountHandler} from './v1/logout.handler.js';

export default async function accountsRoute(fastify: AppFastifyInstance) {
  fastify.post('/accounts/v1/create', {schema: CREATE_ACCOUNT_SCHEMA}, createAccountHandler);

  fastify.post('/accounts/v1/login', {schema: LOGIN_ACCOUNT_SCHEMA}, loginAccountHandler);

  fastify.post(
    '/accounts/v1/logout',
    {preHandler: [fastify.authenticate], schema: LOGOUT_ACCOUNT_SCHEMA},
    logoutAccountHandler,
  );

  fastify.get(
    '/accounts/v1/who-am-i',
    {preHandler: [fastify.authenticate], schema: WHO_AM_I_ACCOUNT_SCHEMA},
    whoAmIAccountHandler,
  );
}
