import registerBaseDependencies from '@src/dependency-injection/register-base-dependencies.js';
import {createContainer, type AwilixContainer} from 'awilix';
import {beforeEach, describe, expect, vi, type TestContext} from 'vitest';

// eslint-disable-next-line @typescript-eslint/naming-convention
const {fakeLoggerFactory, fakeDbFactory} = vi.hoisted(() => {
  return {
    fakeLoggerFactory: vi.fn().mockImplementation(() => 'fakeLogger'),
    fakeDbFactory: vi.fn().mockImplementation(() => 'fakeDB'),
  };
});

vi.mock('@config/config.js', () => {
  return {
    CONFIG: 'fakeConfig',
  };
});

vi.mock('@shared/logger/logger.js', () => {
  return {
    default: fakeLoggerFactory,
  };
});

vi.mock('@shared/live-video-sync-db/live-video-sync-db.js', () => {
  return {
    default: fakeDbFactory,
  };
});

interface LocalTestContext extends TestContext {
  container: AwilixContainer;
}

describe<LocalTestContext>('Register base dependencies', it => {
  beforeEach<LocalTestContext>(context => {
    context.container = registerBaseDependencies(createContainer());
    fakeLoggerFactory.mockClear();
    fakeDbFactory.mockClear();
  });

  it('loads config as dependency', ({container}) => {
    expect(container.resolve('config')).toBe('fakeConfig');
  });

  it('loads logger as dependency', ({container}) => {
    expect(container.resolve('logger')).toBe('fakeLogger');
  });

  it('loads live video sync database as dependency', ({container}) => {
    expect(container.resolve('liveVideoSyncDB')).toBe('fakeDB');
  });

  it('loads logger with scoped lifetime', ({container}) => {
    container.resolve('logger');
    const scopedContainer = container.createScope();
    scopedContainer.resolve('logger');

    expect(fakeLoggerFactory).toHaveBeenCalledTimes(2);
  });

  it('loads live video sync database with singleton lifetime', ({container}) => {
    container.resolve('liveVideoSyncDB');
    const scopedContainer = container.createScope();
    scopedContainer.resolve('liveVideoSyncDB');

    expect(fakeDbFactory).toHaveBeenCalledOnce();
  });
});
