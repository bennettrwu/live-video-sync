import {asClass, AwilixContainer, createContainer, InjectionMode, Lifetime} from 'awilix';
import {registerBaseDependencies} from './register-base-dependencies.js';
import path from 'path';
import {fileURLToPath} from 'url';

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates dependency container and registers all dependencies with container
 * Files in "shared" and "modules" folders in the form *.service.js or *.repository.js
 * All dependencies are registered as class dependencies with scoped lifetimes
 * If dispose() is a class method, it is called when the dependency goes out of scope (cleanup should occur in dispose() method)
 * @returns dependency container
 */
export default async function createDependencyContainer(): Promise<AwilixContainer<Dependencies>> {
  const dependencyContainer = createContainer({injectionMode: InjectionMode.CLASSIC, strict: true});

  registerBaseDependencies(dependencyContainer);

  await dependencyContainer.loadModules([path.join(DIRNAME, '../{shared,modules}/**/*.{service,repository}.{js,ts}')], {
    formatName: 'camelCase',
    resolverOptions: {
      register: asClass,
      lifetime: Lifetime.SCOPED,
      dispose: instance => {
        if (typeof instance.dispose === 'function') instance.dispose();
      },
    },
    esModules: true,
  });

  return dependencyContainer;
}
