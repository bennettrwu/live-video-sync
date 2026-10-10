import { describe, expect, it } from 'vitest';

import { clientWith, playingRoom } from '#tests/scenarios/helpers.js';

describe('scenario 11: lossy, jittery network', () => {
  it('still converges without oscillating', () => {
    // Arrange: 200 ± 80 ms, and a relay that loses 20 % of broadcasts
    const lossy = (seed: number) =>
      clientWith({
        network: { latencyMs: 200, jitterMs: 80, dropRate: 0.2, seed },
      });
    const sim = playingRoom({ A: lossy(1), B: lossy(2) });

    // Act
    sim.run(25_000);

    // Assert: jitter bounds the clock estimate, so the dead zone is wider than
    // in a clean network, and the periodic snapshot repairs lost broadcasts
    expect(sim.maxPairwiseError()).toBeLessThan(0.25);
    expect(sim.commands('A', 'seek').length).toBeLessThanOrEqual(3);
    expect(sim.commands('B', 'seek').length).toBeLessThanOrEqual(3);
    expect(sim.view('A').phase).toBe('playing');
    expect(sim.view('B').phase).toBe('playing');
  });
});
