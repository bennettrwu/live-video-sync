import { describe, expect, it } from 'vitest';

import {
  clientWith,
  defaultClient,
  playingRoom,
} from '#tests/scenarios/helpers.js';

describe('scenario 4: B stalls briefly', () => {
  it('shows B as stalled on A, never pauses A, and B catches up by rate', () => {
    // Arrange: a 1.2 s stall is long enough to be detected (300 ms without
    // progress, sampled every 250 ms) but short of the 1.5 s room freeze
    const sim = playingRoom({
      A: defaultClient,
      B: clientWith({ player: { stalls: [{ atVideoTime: 5, forMs: 1200 }] } }),
    });
    const pausesBefore = sim.commands('A', 'pause').length;

    // Act
    sim.run(5000);
    const badge = new Set<string>();
    for (let elapsed = 0; elapsed < 3000; elapsed += 100) {
      sim.run(100);
      for (const member of sim.view('A').stalledMembers) badge.add(member.name);
    }
    sim.run(30_000);

    // Assert: 1.2 s of lost time at a 5 % nudge takes ~24 s to recover
    expect([...badge]).toEqual(['B']);
    expect(sim.stallReports('B')).toEqual([true, false]);
    expect(sim.commands('A', 'pause')).toHaveLength(pausesBefore);
    expect(sim.server.room.playback.waiting).toBe(0);
    expect(sim.commands('B', 'seek')).toHaveLength(0);
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
  });
});
