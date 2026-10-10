import { describe, expect, it } from 'vitest';

import { type PlaybackState, positionAt } from '#src/playback-state.js';

const playing: PlaybackState = {
  seq: 1,
  mediaId: 'a',
  paused: false,
  anchorVideoTime: 100,
  anchorServerTime: 50_000,
  waiting: 0,
};

describe('positionAt', () => {
  it('advances in real time while playing', () => {
    expect(positionAt(playing, 50_000)).toBe(100);
    expect(positionAt(playing, 52_500)).toBe(102.5);
  });

  it('freezes at the anchor while paused', () => {
    expect(positionAt({ ...playing, paused: true }, 60_000)).toBe(100);
  });

  it('freezes at the anchor while anyone is waiting', () => {
    expect(positionAt({ ...playing, waiting: 1 }, 60_000)).toBe(100);
  });

  it('extrapolates backwards for a time before the anchor', () => {
    expect(positionAt(playing, 49_000)).toBe(99);
  });
});
