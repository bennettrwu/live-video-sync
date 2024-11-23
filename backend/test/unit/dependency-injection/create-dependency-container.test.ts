import createDependencyContainer from '@src/dependency-injection/create-dependency-container.js';
import {asFunction, type AwilixContainer} from 'awilix';
import path from 'path';
import {fileURLToPath} from 'url';
import {beforeEach, describe, expect, vi, type Mock, type TestContext} from 'vitest';
import type Module1Service from './test-dependencies/modules/module1/module1.service.js';
import type Module1Repository from './test-dependencies/modules/module1/module1.repository.js';
import type Module2Service from './test-dependencies/modules/module2/some/nesting/module2.service.js';
import type Module2Repository from './test-dependencies/modules/module2/some/nesting/module2.repository.js';
import type SharedService from './test-dependencies/shared/some/nesting/shared.service.js';
import type SharedRepository from './test-dependencies/shared/some/nesting/shared.repository.js';
import formatTestNames from '../../utils/format-test-names.js';
import type {ConfigType} from '@config/config-schema.js';

const TEST_DEPS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'test-dependencies');

vi.mock('@src/dependency-injection/register-base-dependencies.js', () => {
  return {default: vi.fn()};
});

export interface TestDependencies {
  disposeSpy: (id: string) => void;
  scopedCounter: () => number;
  module1Service: Module1Service;
  module1Repository: Module1Repository;
  module2Service: Module2Service;
  module2Repository: Module2Repository;
  sharedService: SharedService;
  sharedRepository: SharedRepository;
}

interface LocalTestContext extends TestContext {
  disposeSpy: Mock;
  container: AwilixContainer<TestDependencies>;
  scopedContainer: AwilixContainer<TestDependencies>;
}

describe('Create dependency container', () => {
  beforeEach<LocalTestContext>(async context => {
    context.container = (await createDependencyContainer(
      TEST_DEPS_DIR,
      {} as ConfigType,
    )) as unknown as AwilixContainer<TestDependencies>;

    context.disposeSpy = vi.fn();

    function createCounter() {
      let count = 0;
      return () => count++;
    }

    context.container.register({
      scopedCounter: asFunction(createCounter).scoped(),
      disposeSpy: asFunction(() => context.disposeSpy).singleton(),
    });
    context.scopedContainer = context.container.createScope();

    // Start scope counter at 100 for base container, 0 for scoped container
    for (let i = 0; i < 100; i++) context.container.resolve('scopedCounter')();
  });

  describe<LocalTestContext>('autoloads all dependencies', it => {
    it.for(
      formatTestNames([
        {name: 'service class from modules directory', className: 'module1Service', moduleId: 'module1Service - 100'},
        {
          name: 'repository class from modules directory',
          className: 'module1Repository',
          moduleId: 'module1Repository - 100',
        },
        {
          name: 'service class from nested modules directory',
          className: 'module2Service',
          moduleId: 'module2Service - 100',
        },
        {
          name: 'repository class from nest modules directory',
          className: 'module2Repository',
          moduleId: 'module2Repository - 102', // 102 b/c it has 2 additional dependencies
        },
        {name: 'service class from shared directory', className: 'sharedService', moduleId: 'sharedService - 100'},
        {
          name: 'repository class from shared directory',
          className: 'sharedRepository',
          moduleId: 'sharedRepository - 100',
        },
      ]),
    )('loads %s', ([, {className, moduleId}], {container}) => {
      const loaded = container.resolve(className) as {getId: () => string};

      expect(loaded.getId()).toBe(moduleId);
    });
  });

  describe<LocalTestContext>('injects dependencies', it => {
    it('uses already instanciated dependencies when needed', ({scopedContainer}) => {
      scopedContainer.resolve('module1Service'); // counter 0
      scopedContainer.resolve('module1Repository'); // counter 1
      const module2Repository = scopedContainer.resolve('module2Repository');

      expect(module2Repository.getModule1ServiceId()).toBe('module1Service - 0');
      expect(module2Repository.getModule1RepositoryId()).toBe('module1Repository - 1');
    });

    it('instanciates unmet dependencies when needed', ({scopedContainer}) => {
      scopedContainer.resolve('module1Repository'); // counter 0
      const module2Repository = scopedContainer.resolve('module2Repository');

      expect(module2Repository.getModule1ServiceId()).toBe('module1Service - 1'); // should be instanciated automatically
      expect(module2Repository.getModule1RepositoryId()).toBe('module1Repository - 0');
    });
  });

  describe<LocalTestContext>('dependency lifetime', it => {
    it('automatically loads classes with scoped lifetime', ({container, scopedContainer}) => {
      const module = container.resolve('module1Service');
      const scopedModule = scopedContainer.resolve('module1Service');
      const sameScopedModule = scopedContainer.resolve('module1Service');

      expect(module.getId()).toBe('module1Service - 100');
      expect(scopedModule.getId()).toBe('module1Service - 0');
      expect(sameScopedModule.getId()).toBe('module1Service - 0');
    });
  });

  describe<LocalTestContext>('disposes dependencies when scope is disposed', it => {
    it('calls synchronous dispose function when scope is disposed', async ({scopedContainer, disposeSpy}) => {
      scopedContainer.resolve('module1Service');

      await scopedContainer.dispose();

      expect(disposeSpy).toHaveBeenCalledWith('module1Service - 0');
    });

    it('calls asynchronous dispose function when scope is disposed', async ({scopedContainer, disposeSpy}) => {
      scopedContainer.resolve('module1Repository');

      await scopedContainer.dispose();

      expect(disposeSpy).toHaveBeenCalledWith('module1Repository - 0');
    });

    it('does nothing if dispose function is not defined', async ({scopedContainer, disposeSpy}) => {
      scopedContainer.resolve('sharedService');
      scopedContainer.resolve('sharedRepository');

      await scopedContainer.dispose();

      expect(disposeSpy).not.toHaveBeenCalledWith('sharedService - 4');
      expect(disposeSpy).not.toHaveBeenCalledWith('sharedRepository - 5');
    });

    it('calls all dispose functions when scope is disposed', async ({scopedContainer, disposeSpy}) => {
      scopedContainer.resolve('module1Service');
      scopedContainer.resolve('module1Repository');
      scopedContainer.resolve('module2Service');
      scopedContainer.resolve('module2Repository');
      scopedContainer.resolve('sharedService');
      scopedContainer.resolve('sharedRepository');

      await scopedContainer.dispose();

      expect(disposeSpy).toHaveBeenCalledWith('module1Service - 0');
      expect(disposeSpy).toHaveBeenCalledWith('module1Repository - 1');
      expect(disposeSpy).toHaveBeenCalledWith('module2Service - 2');
      expect(disposeSpy).toHaveBeenCalledWith('module2Repository - 3');
      expect(disposeSpy).not.toHaveBeenCalledWith('sharedService - 4');
      expect(disposeSpy).not.toHaveBeenCalledWith('sharedRepository - 5');
    });
  });
});
