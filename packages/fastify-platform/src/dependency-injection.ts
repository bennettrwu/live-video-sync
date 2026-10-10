import { fastifyAwilixPlugin } from '@fastify/awilix';
import {
  type AwilixContainer,
  InjectionMode,
  type Resolver,
  createContainer,
} from 'awilix';

import type { BaseFastifyInstance } from './create-base-server.js';

/**
 * Creates an awilix container in CLASSIC mode: constructor parameters are
 * resolved by name, so a class written `constructor(roomRepository, now)`
 * receives the registrations named `roomRepository` and `now`.
 */
export function createDependencyContainer<
  TCradle extends object,
>(): AwilixContainer<TCradle> {
  return createContainer<TCradle>({
    injectionMode: InjectionMode.CLASSIC,
    strict: true,
  });
}

/** One resolver per cradle entry. */
export type Registrations<TCradle> = {
  [K in keyof TCradle]: Resolver<TCradle[K]>;
};

/**
 * Adds registrations to a container.
 */
export function registerDependencies<TCradle extends object>(
  container: AwilixContainer<TCradle>,
  registrations: Registrations<TCradle>,
): void {
  container.register(registrations as Record<string, Resolver<unknown>>);
}

/**
 * The container registered on the server, typed by the caller's cradle.
 */
export function getDependencyContainer<TCradle extends object>(
  app: BaseFastifyInstance,
): AwilixContainer<TCradle> {
  return app.diContainer as unknown as AwilixContainer<TCradle>;
}

/**
 * Exposes the container as `app.diContainer` and `request.diScope`, and
 * disposes it when the server closes.
 */
export async function registerDependencyInjection<TCradle extends object>(
  app: BaseFastifyInstance,
  container: AwilixContainer<TCradle>,
): Promise<void> {
  await app.register(fastifyAwilixPlugin, {
    container,
    disposeOnClose: true,
    disposeOnResponse: false,
    strictBooleanEnforced: true,
  });
}
