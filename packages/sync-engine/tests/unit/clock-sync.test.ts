import { describe, expect, it } from 'vitest';

import {
  type ClockSyncSamples,
  bestOffset,
  bestRtt,
  recordSample,
} from '#src/clock-sync.js';

describe('clock sync', () => {
  it('has no estimate before any sample', () => {
    expect(bestOffset([])).toBeNull();
    expect(bestRtt([])).toBeNull();
  });

  it('computes the offset from a symmetric round trip', () => {
    // Act: remote is 1000 ms ahead, 40 ms each way
    const samples = recordSample([], 10_000, 11_040, 10_080, 8);

    // Assert
    expect(bestOffset(samples)).toBe(1000);
    expect(bestRtt(samples)).toBe(80);
  });

  it('prefers the sample with the smallest round trip', () => {
    // Arrange: a slow asymmetric sample gives a wrong offset
    let samples: ClockSyncSamples = recordSample([], 0, 1300, 600, 8);

    // Act
    samples = recordSample(samples, 1000, 2010, 1020, 8);

    // Assert
    expect(bestOffset(samples)).toBe(1000);
    expect(bestRtt(samples)).toBe(20);
  });

  it('forgets samples that fall out of the window', () => {
    // Arrange
    let samples: ClockSyncSamples = recordSample([], 0, 1005, 10, 2);
    samples = recordSample(samples, 100, 1150, 200, 2);

    // Act
    samples = recordSample(samples, 300, 1350, 400, 2);

    // Assert
    expect(bestRtt(samples)).toBe(100);
  });

  it('discards a sample with a negative round trip', () => {
    expect(recordSample([], 1000, 2000, 900, 8)).toEqual([]);
  });
});
