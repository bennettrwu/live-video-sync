import {asClass, AwilixContainer, createContainer, InjectionMode, Lifetime} from 'awilix';
import registerBaseDependencies from './register-base-dependencies.js';
import path from 'path';

/**
 * Creates dependency container and registers all dependencies with container
 * Files in "shared" and "modules" folders in the form *.service.js or *.repository.js
 * All dependencies are registered as class dependencies with scoped lifetimes
 * If dispose() is a class method, it is called when the dependency goes out of scope (cleanup should occur in dispose() method)
 * @returns dependency container
 */
export default async function createDependencyContainer(directory: string): Promise<AwilixContainer<Dependencies>> {
  const dependencyContainer = createContainer({injectionMode: InjectionMode.CLASSIC, strict: true});

  registerBaseDependencies(dependencyContainer);

  await dependencyContainer.loadModules([path.join(directory, '/{shared,modules}/**/*.{service,repository}.{js,ts}')], {
    formatName: 'camelCase',
    resolverOptions: {
      register: asClass,
      lifetime: Lifetime.SCOPED,
      dispose: async instance => {
        if (typeof instance.dispose === 'function') await instance.dispose();
      },
    },
    esModules: true,
  });

  return dependencyContainer;
}
