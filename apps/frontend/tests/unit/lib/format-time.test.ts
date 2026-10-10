import { describe, expect, it } from 'vitest';

import { formatTime } from '#src/lib/format-time.js';

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [5.9, '0:05'],
    [65, '1:05'],
    [3599, '59:59'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
    [NaN, '0:00'],
    [-3, '0:00'],
  ])('formats %s as %s', (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });
});
