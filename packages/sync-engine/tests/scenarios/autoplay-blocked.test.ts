import { describe, expect, it } from 'vitest';

import { clientWith, playingRoom } from '#tests/scenarios/helpers.js';

describe('scenario 8: autoplay is blocked on C', () => {
  it('waits for a tap without disturbing the room, then joins at the target', () => {
    // Arrange
    const sim = playingRoom(undefined, 5000);

    // Act
    sim.addClient(
      'C',
      clientWith({ player: { autoplay: 'rejectUntilGesture' } }),
    );
    sim.run(3000);
    const blocked = {
      phase: sim.view('C').phase,
      paused: sim.player('C').paused,
    };
    const othersInSync =
      Math.abs((sim.positions()['A'] ?? 0) - (sim.positions()['B'] ?? 0)) < 0.1;
    sim.tapToPlay('C');
    sim.run(10_000);

    // Assert
    expect(blocked).toEqual({ phase: 'needsGesture', paused: true });
    expect(othersInSync).toBe(true);
    expect(sim.view('C').phase).toBe('playing');
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
  });
});
