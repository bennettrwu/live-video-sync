import { describe, expect, it } from 'vitest';

import { playingRoom } from '#tests/scenarios/helpers.js';

describe('scenario 7: A loses its socket for 5 s', () => {
  it('pauses after the grace period and resyncs with one seek', () => {
    // Arrange
    const sim = playingRoom(undefined, 5000);
    const seeksBefore = sim.commands('A', 'seek').length;

    // Act
    sim.disconnect('A');
    sim.run(500);
    const withinGrace = sim.player('A').paused;
    sim.run(1000);
    const afterGrace = {
      paused: sim.player('A').paused,
      phase: sim.view('A').phase,
      controls: sim.view('A').controlsEnabled,
    };
    sim.run(3500);
    sim.connect('A');
    sim.run(10_000);

    // Assert
    expect(withinGrace).toBe(false);
    expect(afterGrace).toEqual({
      paused: true,
      phase: 'reconnecting',
      controls: false,
    });
    expect(sim.commands('A', 'seek')).toHaveLength(seeksBefore + 1);
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
    expect(sim.view('A').phase).toBe('playing');
  });
});
