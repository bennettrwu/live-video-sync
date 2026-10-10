import { describe, expect, it } from 'vitest';

import {
  clientWith,
  defaultClient,
  playingRoom,
} from '#tests/scenarios/helpers.js';

describe('scenario 5: B stalls for 4 s', () => {
  it('makes A wait after 1.5 s and resumes both in sync', () => {
    // Arrange
    const sim = playingRoom({
      A: defaultClient,
      B: clientWith({ player: { stalls: [{ atVideoTime: 5, forMs: 4000 }] } }),
    });

    // Act
    sim.run(5000 + 3500);
    const duringWait = {
      phase: sim.view('A').phase,
      paused: sim.player('A').paused,
    };
    sim.run(2000);
    const afterRecovery = {
      A: sim.player('A').paused,
      B: sim.player('B').paused,
    };
    sim.run(10_000);

    // Assert: B's report lands within a second of the stall and the room
    // freezes 1.5 s after that, so A is waiting by 3.5 s; B recovers at 4 s
    expect(duringWait).toEqual({ phase: 'waitingForOthers', paused: true });
    expect(afterRecovery).toEqual({ A: false, B: false });
    expect(sim.commands('B', 'seek').length).toBeLessThanOrEqual(1);
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
  });
});
