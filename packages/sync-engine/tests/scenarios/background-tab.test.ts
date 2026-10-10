import { describe, expect, it } from 'vitest';

import { playingRoom } from '#tests/scenarios/helpers.js';

describe('scenario 6: B is backgrounded for a minute', () => {
  it('resyncs with one seek and no stall report on return', () => {
    // Arrange
    const sim = playingRoom(undefined, 5000);
    const seeksBefore = sim.commands('B', 'seek').length;
    const reportsBefore = sim.stallReports('B').length;

    // Act
    sim.hide('B');
    sim.run(60_000);
    sim.show('B');
    sim.run(10_000);

    // Assert
    expect(sim.commands('B', 'seek')).toHaveLength(seeksBefore + 1);
    expect(sim.stallReports('B').slice(reportsBefore)).toEqual([]);
    expect(sim.maxPairwiseError()).toBeLessThan(0.1);
    expect(sim.view('B').phase).toBe('playing');
  });
});
