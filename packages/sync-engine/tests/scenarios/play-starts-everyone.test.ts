import { describe, expect, it } from 'vitest';

import { playingRoom } from '#tests/scenarios/helpers.js';

describe('scenario 1: A presses play', () => {
  it('starts both players within one round trip plus a tick and converges', () => {
    // Arrange
    const sim = playingRoom();

    // Act
    sim.run(400);
    const bothPlaying = !sim.player('A').paused && !sim.player('B').paused;
    sim.run(10_000);

    // Assert: 50 ms latency + 250 ms tick < 400 ms; rate nudging closes a
    // sub-second gap at 5 % per second well within 10 s
    expect(bothPlaying).toBe(true);
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
    expect(sim.commands('A', 'seek')).toHaveLength(0);
    expect(sim.commands('B', 'seek')).toHaveLength(0);
  });
});
