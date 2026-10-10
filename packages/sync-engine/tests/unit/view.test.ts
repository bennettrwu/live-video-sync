import { describe, expect, it } from 'vitest';

import { initialEngineState } from '#src/engine-state.js';
import { deriveView } from '#src/view.js';
import { joined, playingEp1, snapshot, step } from '#tests/unit/helpers.js';

describe('deriveView', () => {
  it('is joining before a welcome', () => {
    // Act
    const view = deriveView(initialEngineState('alice'));

    // Assert
    expect(view.phase).toBe('joining');
    expect(view.controlsEnabled).toBe(false);
  });

  it('is playing once joined and ready', () => {
    // Act
    const view = deriveView(joined());

    // Assert
    expect(view).toMatchObject({
      phase: 'playing',
      controlsEnabled: true,
      name: 'alice',
      connectionId: 'conn-1',
      currentMediaId: 'ep1',
      waiting: false,
    });
    expect(view.debug.seq).toBe(5);
  });

  it('is idle with controls enabled when no media is selected', () => {
    // Act
    const view = deriveView(
      joined({ ...playingEp1, mediaId: null, paused: true }),
    );

    // Assert
    expect(view.phase).toBe('idle');
    expect(view.controlsEnabled).toBe(true);
  });

  it('is loading until the media is ready', () => {
    // Arrange
    const state = step(joined(), {
      type: 'tick',
      snapshot: snapshot(2000, {}, { mediaId: 'ep1', ready: false }),
    }).state;

    // Act
    const view = deriveView(state);

    // Assert
    expect(view.phase).toBe('loading');
    expect(view.controlsEnabled).toBe(false);
  });

  it('is reconnecting after losing the connection', () => {
    // Act
    const view = deriveView(
      step(joined(), { type: 'disconnected', now: 2000 }).state,
    );

    // Assert
    expect(view.phase).toBe('reconnecting');
    expect(view.controlsEnabled).toBe(false);
  });

  it('is waiting for others while the room clock is frozen', () => {
    // Arrange
    const state = step(joined(), {
      type: 'message',
      now: 2000,
      msg: {
        t: 'playback',
        playback: { ...playingEp1, seq: 6, waiting: 1 },
      },
    }).state;
    const members = step(state, {
      type: 'message',
      now: 2000,
      msg: {
        t: 'members',
        members: [
          { connectionId: 'conn-1', name: 'alice', stalledSince: null },
          { connectionId: 'conn-2', name: 'bob', stalledSince: 1500 },
        ],
      },
    }).state;

    // Act
    const view = deriveView(members);

    // Assert
    expect(view.phase).toBe('waitingForOthers');
    expect(view.waiting).toBe(true);
    expect(view.stalledMembers.map((m) => m.name)).toEqual(['bob']);
  });

  it('needs a gesture after autoplay is rejected', () => {
    // Act
    const state = step(joined(), {
      type: 'player',
      event: { type: 'playRejected', reason: 'gesture' },
      now: 2000,
    }).state;

    // Assert
    expect(deriveView(state).phase).toBe('needsGesture');
  });

  it('reports an error above everything else', () => {
    // Act
    const state = step(joined(), {
      type: 'player',
      event: { type: 'error', fatal: true, message: 'boom' },
      now: 2000,
    }).state;

    // Assert
    expect(deriveView(state).phase).toBe('error');
  });
});
