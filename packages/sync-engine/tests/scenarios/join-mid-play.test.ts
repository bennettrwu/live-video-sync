import { describe, expect, it } from 'vitest';

import { defaultClient, playingRoom } from '#tests/scenarios/helpers.js';

describe('scenario 2: C joins mid-play', () => {
  it('loads at the room position and settles without a seek storm', () => {
    // Arrange
    const sim = playingRoom(undefined, 5000);

    // Act
    sim.addClient('C', defaultClient);
    sim.run(10_000);

    // Assert: the load lands within the 200 ms load latency of the target,
    // so at most one corrective seek is acceptable
    const load = sim.commands('C', 'load')[0];
    expect(load).toMatchObject({ type: 'load', mediaId: 'ep1' });
    expect(load?.type === 'load' ? load.startAt : 0).toBeGreaterThan(4.5);
    expect(sim.commands('C', 'seek').length).toBeLessThanOrEqual(1);
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
    expect(sim.view('C').phase).toBe('playing');
  });
});
