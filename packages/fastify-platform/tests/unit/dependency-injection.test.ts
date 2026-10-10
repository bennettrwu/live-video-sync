import { asClass, asValue } from 'awilix';
import { describe, expect, it } from 'vitest';

import { createBaseServer } from '#src/create-base-server.js';
import {
  createDependencyContainer,
  registerDependencies,
  registerDependencyInjection,
} from '#src/dependency-injection.js';

class Greeter {
  private readonly _greeting: string;

  public constructor(greeting: string) {
    this._greeting = greeting;
  }

  public greet(name: string): string {
    return `${this._greeting}, ${name}`;
  }
}

interface TestCradle {
  greeting: string;
  greeter: Greeter;
}

describe('dependency injection', () => {
  it('resolves constructor parameters by name', () => {
    // Arrange
    const container = createDependencyContainer<TestCradle>();

    // Act
    registerDependencies(container, {
      greeting: asValue('Hello'),
      greeter: asClass(Greeter).singleton(),
    });

    // Assert
    expect(container.cradle.greeter.greet('Ada')).toBe('Hello, Ada');
  });

  it('exposes the container on the server', async () => {
    // Arrange
    const app = createBaseServer({ logLevel: 'silent' });
    const container = createDependencyContainer<TestCradle>();
    registerDependencies(container, {
      greeting: asValue('Hi'),
      greeter: asClass(Greeter).singleton(),
    });

    // Act
    await registerDependencyInjection(app, container);
    await app.ready();

    // Assert
    expect(app.diContainer).toBe(container);
    await app.close();
  });
});
