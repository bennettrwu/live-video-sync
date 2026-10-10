import { describe, expect, it } from 'vitest';

import { correct } from '#src/correction.js';
import { DEFAULT_ENGINE_POLICY as policy } from '#src/policy.js';

const idle = { rate: 1, lastSeekAt: Number.NEGATIVE_INFINITY };

function at(currentTime: number, paused = false) {
  return { currentTime, target: 100, paused };
}

describe('correct', () => {
  it.each([
    { name: 'tiny drift ahead', currentTime: 100.05 },
    { name: 'tiny drift behind', currentTime: 99.95 },
  ])('does nothing in the dead zone: $name', ({ currentTime }) => {
    // Act
    const result = correct(at(currentTime), idle, 5000, policy);

    // Assert
    expect(result.commands).toEqual([]);
    expect(result.correction).toBe(idle);
  });

  it('slows down when ahead within the rate zone', () => {
    // Act
    const result = correct(at(100.5), idle, 5000, policy);

    // Assert
    expect(result.commands).toEqual([{ type: 'rate', rate: 0.95 }]);
    expect(result.correction.rate).toBe(0.95);
  });

  it('speeds up when behind within the rate zone', () => {
    // Act
    const result = correct(at(99.5), idle, 5000, policy);

    // Assert
    expect(result.commands).toEqual([{ type: 'rate', rate: 1.05 }]);
  });

  it('clamps the nudge to the allowed range', () => {
    // Act: drift 1.9 behind would ask for 1.95
    const result = correct(at(98.1), idle, 5000, policy);

    // Assert
    expect(result.commands).toEqual([{ type: 'rate', rate: 1.05 }]);
  });

  it('does not repeat a rate it already set', () => {
    // Arrange
    const nudging = { rate: 1.05, lastSeekAt: Number.NEGATIVE_INFINITY };

    // Act
    const result = correct(at(99.5), nudging, 5000, policy);

    // Assert
    expect(result.commands).toEqual([]);
  });

  it('keeps nudging inside the dead zone until the drift is nearly gone', () => {
    // Arrange
    const nudging = { rate: 1.05, lastSeekAt: Number.NEGATIVE_INFINITY };

    // Act
    const stillClosing = correct(at(99.95), nudging, 5000, policy);
    const closed = correct(at(99.99), nudging, 5000, policy);

    // Assert
    expect(stillClosing.commands).toEqual([]);
    expect(closed.commands).toEqual([{ type: 'rate', rate: 1 }]);
  });

  it('seeks beyond the rate zone and resets the rate', () => {
    // Arrange
    const nudging = { rate: 0.95, lastSeekAt: Number.NEGATIVE_INFINITY };

    // Act
    const result = correct(at(105), nudging, 5000, policy);

    // Assert
    expect(result.commands).toEqual([
      { type: 'seek', time: 100 },
      { type: 'rate', rate: 1 },
    ]);
    expect(result.correction).toEqual({ rate: 1, lastSeekAt: 5000 });
  });

  it('respects the seek cooldown', () => {
    // Arrange
    const justSought = { rate: 1, lastSeekAt: 4500 };

    // Act
    const result = correct(at(105), justSought, 5000, policy);

    // Assert
    expect(result.commands).toEqual([]);
  });

  it('seeks a paused player for any drift outside the dead zone', () => {
    // Act
    const result = correct(at(100.5, true), idle, 5000, policy);

    // Assert
    expect(result.commands).toEqual([{ type: 'seek', time: 100 }]);
  });

  it('resets the rate of a paused player', () => {
    // Arrange
    const nudging = { rate: 1.05, lastSeekAt: Number.NEGATIVE_INFINITY };

    // Act
    const result = correct(at(100, true), nudging, 5000, policy);

    // Assert
    expect(result.commands).toEqual([{ type: 'rate', rate: 1 }]);
  });
});
