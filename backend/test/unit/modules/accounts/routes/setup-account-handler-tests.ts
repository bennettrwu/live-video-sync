import SessionService from '@shared/services/session.service.js';
import AccountsRepository from '@src/modules/accounts/repository/accounts.repository.js';
import accountsRoute from '@src/modules/accounts/routes/accounts.route.js';
import AccountsService from '@src/modules/accounts/services/accounts.service.js';
import fakeClass from '@test/utils/fakes/fake-class.js';
import {
  useTestFastifyInstanceWithAuth,
  type FastifyAuthedTestContext,
} from '@test/utils/test-setup/use-test-fastify-instance.js';
import {asValue} from 'awilix';
import {beforeEach, type Mocked} from 'vitest';

export interface AccountRoutesTestContext extends FastifyAuthedTestContext {
  accountsService: Mocked<AccountsService>;
  sessionService: Mocked<SessionService>;
  accountsRepository: Mocked<AccountsRepository>;
}

export default function setupAccountHandlerTests() {
  useTestFastifyInstanceWithAuth();

  beforeEach<AccountRoutesTestContext>(context => {
    context.accountsService = fakeClass(AccountsService);
    context.sessionService = fakeClass(SessionService);
    context.accountsRepository = fakeClass(AccountsRepository);

    context.container.register({
      accountsService: asValue(context.accountsService),
      sessionService: asValue(context.sessionService),
      accountsRepository: asValue(context.accountsRepository),
    });

    context.fastify.register(accountsRoute);
  });
}
