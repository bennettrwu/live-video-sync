import {asFunction, AwilixContainer, createContainer, InjectionMode, Lifetime} from 'awilix';
import {registerBaseDependencies} from './register-base-dependencies';
import path from 'path';

export default function createDependencyContainer(): AwilixContainer<Dependencies> {
  const dependencyContainer = createContainer({injectionMode: InjectionMode.PROXY, strict: true});

  registerBaseDependencies(dependencyContainer);

  dependencyContainer.loadModules(
    [
      path.join(__dirname, '../modules/**/*.controller.js'),
      path.join(__dirname, '../modules/**/*.service.js'),
      path.join(__dirname, '../modules/**/*.repository.js'),
    ],
    {
      formatName: 'camelCase',
      resolverOptions: {
        register: asFunction,
        lifetime: Lifetime.SCOPED,
      },
    }
  );

  return dependencyContainer;
}
