import { beforeEach, describe, expect, it } from 'vitest';

import { loadName, saveName } from '#src/lib/identity.js';

describe('identity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has no name until one is saved', () => {
    expect(loadName()).toBeNull();
  });

  it('round-trips a trimmed name', () => {
    // Act
    saveName('  Alice ');

    // Assert
    expect(loadName()).toBe('Alice');
  });

  it('treats a blank stored name as absent', () => {
    // Arrange
    localStorage.setItem('live-video-sync.name', '   ');

    // Assert
    expect(loadName()).toBeNull();
  });
});
