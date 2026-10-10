import { Check } from 'typebox/value';
import { describe, expect, it } from 'vitest';

import { ClientMessageSchema, ServerMessageSchema } from '#src/messages.js';

describe('ClientMessageSchema', () => {
  it.each([
    { t: 'hello', name: 'alice' },
    { t: 'hello', name: 'alice', lastSeq: 3 },
    { t: 'intent', id: 1, intent: { action: 'play' } },
    { t: 'intent', id: 2, intent: { action: 'seek', time: 12.5 } },
    { t: 'intent', id: 3, intent: { action: 'media', mediaId: 'ep1' } },
    { t: 'intent', id: 4, intent: { action: 'stall', on: true } },
    { t: 'ping', c: 123.4 },
  ])('accepts %j', (msg) => {
    expect(Check(ClientMessageSchema, msg)).toBe(true);
  });

  it.each([
    { t: 'hello', name: '' },
    { t: 'intent', id: 1, intent: { action: 'jump' } },
    { t: 'intent', id: -1, intent: { action: 'play' } },
    { t: 'ping' },
    { t: 'welcome' },
    'play',
  ])('rejects %j', (msg) => {
    expect(Check(ClientMessageSchema, msg)).toBe(false);
  });
});

describe('ServerMessageSchema', () => {
  const playback = {
    seq: 0,
    mediaId: null,
    paused: true,
    anchorVideoTime: 0,
    anchorServerTime: 0,
    waiting: 0,
  };

  it('accepts a welcome', () => {
    const msg = {
      t: 'welcome',
      you: { connectionId: 'c1' },
      room: { code: 'abc', name: 'Movie night' },
      media: [{ id: 'ep1', name: 'Episode 1', url: '/media/ep1.m3u8' }],
      members: [{ connectionId: 'c1', name: 'alice', stalledSince: null }],
      playback,
      log: [],
    };
    expect(Check(ServerMessageSchema, msg)).toBe(true);
  });

  it('accepts playback with and without a cause', () => {
    expect(Check(ServerMessageSchema, { t: 'playback', playback })).toBe(true);
    expect(
      Check(ServerMessageSchema, {
        t: 'playback',
        playback,
        cause: { connectionId: 'c1', intentId: 4 },
      }),
    ).toBe(true);
  });

  it('rejects an unknown error code', () => {
    expect(
      Check(ServerMessageSchema, { t: 'error', code: 'nope', message: '' }),
    ).toBe(false);
  });
});
