import { describe, expect, it } from 'vitest';

import {
  clientWith,
  defaultClient,
  playingRoom,
} from '#tests/scenarios/helpers.js';

describe('scenario 10: media changes while B is stalled', () => {
  it('lands everyone paused at zero with the stall cleared, then plays in sync', () => {
    // Arrange: B stalls for a long time at 5 s so the room is frozen
    const sim = playingRoom({
      A: defaultClient,
      B: clientWith({
        player: { stalls: [{ atVideoTime: 5, forMs: 20_000 }] },
      }),
    });
    sim.run(9000);
    const frozen = sim.view('A').phase;

    // Act
    sim.intent('A', { action: 'media', mediaId: 'ep2' });
    sim.run(2000);
    const afterSwitch = {
      A: {
        media: sim.view('A').currentMediaId,
        paused: sim.player('A').paused,
        time: sim.positions()['A'],
      },
      B: {
        media: sim.view('B').currentMediaId,
        paused: sim.player('B').paused,
        time: sim.positions()['B'],
      },
      waiting: sim.server.room.playback.waiting,
      stalled: sim.view('A').stalledMembers,
    };
    sim.intent('A', { action: 'play' });
    sim.run(10_000);

    // Assert
    expect(frozen).toBe('waitingForOthers');
    expect(afterSwitch).toEqual({
      A: { media: 'ep2', paused: true, time: 0 },
      B: { media: 'ep2', paused: true, time: 0 },
      waiting: 0,
      stalled: [],
    });
    expect(sim.view('A').phase).toBe('playing');
    expect(sim.view('B').phase).toBe('playing');
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
  });
});
