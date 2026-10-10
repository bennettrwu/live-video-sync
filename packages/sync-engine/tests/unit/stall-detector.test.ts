import { describe, expect, it } from 'vitest';

import type { StallTracker } from '#src/engine-state.js';
import { resetStallTracker, trackProgress } from '#src/stall-detector.js';

const fresh: StallTracker = {
  since: null,
  reported: false,
  lastProgressAt: 0,
  lastTime: 10,
};

function player(
  currentTime: number,
  readyState: 0 | 1 | 2 | 3 | 4 = 4,
  paused = false,
) {
  return { currentTime, paused, rate: 1, readyState, ended: false };
}

describe('trackProgress', () => {
  it('is not stalled while the position advances', () => {
    // Act
    const result = trackProgress(fresh, player(10.25, 2), 250, 300);

    // Assert
    expect(result.stalled).toBe(false);
    expect(result.tracker.lastProgressAt).toBe(250);
  });

  it('is not stalled when frozen but the buffer is healthy', () => {
    // Act
    const result = trackProgress(fresh, player(10, 4), 1000, 300);

    // Assert
    expect(result.stalled).toBe(false);
  });

  it('is stalled after enough time without progress and data', () => {
    // Act
    const early = trackProgress(fresh, player(10, 2), 250, 300);
    const late = trackProgress(early.tracker, player(10, 2), 500, 300);

    // Assert
    expect(early.stalled).toBe(false);
    expect(late.stalled).toBe(true);
    expect(late.tracker.since).toBe(500);
  });

  it('keeps the original stall start while it continues', () => {
    // Arrange
    const stalled = trackProgress(fresh, player(10, 2), 500, 300);

    // Act
    const still = trackProgress(stalled.tracker, player(10, 2), 750, 300);

    // Assert
    expect(still.tracker.since).toBe(500);
  });

  it('clears the stall once the position moves again', () => {
    // Arrange
    const stalled = trackProgress(fresh, player(10, 2), 500, 300);

    // Act
    const recovered = trackProgress(stalled.tracker, player(10.1, 4), 750, 300);

    // Assert
    expect(recovered.stalled).toBe(false);
    expect(recovered.tracker.since).toBeNull();
  });

  it('never reports a paused player as stalled', () => {
    // Act
    const result = trackProgress(fresh, player(10, 2, true), 5000, 300);

    // Assert
    expect(result.stalled).toBe(false);
    expect(result.tracker.lastProgressAt).toBe(5000);
  });

  it('reset treats now as the last progress', () => {
    // Act
    const tracker = resetStallTracker(fresh, 9000, 42);

    // Assert
    expect(tracker).toMatchObject({ lastProgressAt: 9000, lastTime: 42 });
  });
});
