import { describe, expect, it } from 'vitest';

import { describeLogEntry } from '#src/lib/describe-log-entry.js';

const media = [{ id: 'ep1', name: 'Episode 1', url: '/x.m3u8' }];

describe('action log descriptions', () => {
  it.each([
    [{ kind: 'join' }, 'Bob joined'],
    [{ kind: 'leave' }, 'Bob left'],
    [{ kind: 'play', at: 62 }, 'Bob played at 1:02'],
    [{ kind: 'pause', at: 5 }, 'Bob paused at 0:05'],
    [{ kind: 'seek', from: 62, to: 255 }, 'Bob seeked 1:02 → 4:15'],
    [{ kind: 'media', mediaId: 'ep1' }, 'Bob switched to Episode 1'],
    [{ kind: 'media', mediaId: 'zz' }, 'Bob switched to zz'],
    [{ kind: 'stall' }, 'Bob is buffering'],
    [{ kind: 'recovered', afterMs: 2500 }, 'Bob recovered after 2.5 s'],
  ] as const)('describes %j', (event, expected) => {
    expect(
      describeLogEntry(
        { id: 1, at: 0, connectionId: 'c', name: 'Bob', event },
        media,
      ),
    ).toBe(expected);
  });
});
