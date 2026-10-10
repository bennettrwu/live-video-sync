import { describe, expect, it } from 'vitest';

import {
  clientWith,
  defaultClient,
  playingRoom,
} from '#tests/scenarios/helpers.js';

describe('scenario 9: B has a 5 s clock error', () => {
  it('behaves exactly like scenario 1', () => {
    // Arrange
    const sim = playingRoom({
      A: defaultClient,
      B: clientWith({ clockSkewMs: 5000 }),
    });

    // Act
    sim.run(10_000);

    // Assert
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
    expect(sim.commands('B', 'seek')).toHaveLength(0);
  });
});
