import { describe, expect, it } from 'vitest';

import { playingRoom } from '#tests/scenarios/helpers.js';

describe('scenario 3: A seeks', () => {
  it('moves everyone with exactly one seek each and no stall reports', () => {
    // Arrange
    const sim = playingRoom(undefined, 5000);
    const seeksBefore = {
      A: sim.commands('A', 'seek').length,
      B: sim.commands('B', 'seek').length,
    };

    // Act
    sim.intent('A', { action: 'seek', time: 100 });
    sim.run(5000);

    // Assert
    expect(sim.commands('A', 'seek')).toHaveLength(seeksBefore.A + 1);
    expect(sim.commands('B', 'seek')).toHaveLength(seeksBefore.B + 1);
    expect(sim.stallReports('A')).toEqual([]);
    expect(sim.stallReports('B')).toEqual([]);
    expect(sim.positions()['A']).toBeGreaterThan(104);
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
  });
});
