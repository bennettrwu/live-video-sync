import { describe, expect, it } from 'vitest';

import { initialEngineState } from '#src/engine-state.js';
import { DEFAULT_ENGINE_POLICY as policy } from '#src/policy.js';
import {
  joined,
  playingEp1,
  run,
  snapshot,
  step,
  withoutPings,
} from '#tests/unit/helpers.js';

describe('engineStep', () => {
  describe('connection', () => {
    it('says hello on connect', () => {
      // Act
      const { effects } = run([{ type: 'connected', now: 0 }]);

      // Assert
      expect(effects).toEqual([
        { type: 'send', msg: { t: 'hello', name: 'alice' } },
      ]);
    });

    it('includes the last seen seq when reconnecting', () => {
      // Arrange
      const state = step(joined(), { type: 'disconnected', now: 2000 }).state;

      // Act
      const { effects } = step(state, { type: 'connected', now: 3000 });

      // Assert
      expect(effects).toEqual([
        { type: 'send', msg: { t: 'hello', name: 'alice', lastSeq: 5 } },
      ]);
    });

    it('pauses the player once the disconnect grace has passed', () => {
      // Arrange
      const state = step(joined(), { type: 'disconnected', now: 2000 }).state;

      // Act
      const early = step(state, { type: 'tick', snapshot: snapshot(2500) });
      const late = step(early.state, {
        type: 'tick',
        snapshot: snapshot(3000),
      });

      // Assert
      expect(early.effects).toEqual([]);
      expect(late.effects).toEqual([
        { type: 'player', cmd: { type: 'pause' } },
      ]);
    });
  });

  describe('messages', () => {
    it('only pings until the clock is sampled', () => {
      // Arrange
      const connected = run([{ type: 'connected', now: 0 }]).state;

      // Act
      const { effects } = step(connected, {
        type: 'tick',
        snapshot: snapshot(100, {}, null),
      });

      // Assert
      expect(effects).toEqual([{ type: 'send', msg: { t: 'ping', c: 100 } }]);
    });

    it('ignores playback that is not newer', () => {
      // Arrange
      const state = joined();

      // Act
      const { state: next } = step(state, {
        type: 'message',
        now: 2000,
        msg: { t: 'playback', playback: { ...playingEp1, paused: true } },
      });

      // Assert
      expect(next.playback).toBe(state.playback);
    });

    it('accepts newer playback and clears pending intents', () => {
      // Arrange
      const sent = step(joined(), {
        type: 'intent',
        intent: { action: 'pause' },
        now: 2000,
      }).state;

      // Act
      const { state } = step(sent, {
        type: 'message',
        now: 2100,
        msg: {
          t: 'playback',
          playback: { ...playingEp1, seq: 6, paused: true },
          cause: { connectionId: 'conn-1', intentId: 0 },
        },
      });

      // Assert
      expect(sent.pending).toHaveLength(1);
      expect(state.pending).toEqual([]);
      expect(state.playback?.seq).toBe(6);
    });

    it('bounds the log', () => {
      // Arrange
      let state = joined();

      // Act
      for (let id = 0; id < policy.logLimit + 10; id++) {
        state = step(state, {
          type: 'message',
          now: 2000,
          msg: {
            t: 'log',
            entry: {
              id,
              at: 0,
              connectionId: 'c',
              name: 'n',
              event: { kind: 'join' },
            },
          },
        }).state;
      }

      // Assert
      expect(state.log).toHaveLength(policy.logLimit);
      expect(state.log[0]?.id).toBe(10);
    });
  });

  describe('media', () => {
    it('loads the room media at the current position', () => {
      // Arrange
      const state = joined();

      // Act
      const { effects } = step(state, {
        type: 'tick',
        snapshot: snapshot(3000, {}, null),
      });

      // Assert
      expect(withoutPings(effects)).toEqual([
        {
          type: 'player',
          cmd: {
            type: 'load',
            mediaId: 'ep1',
            url: '/media/ep1.m3u8',
            startAt: 102,
          },
        },
      ]);
    });

    it('issues nothing else until the media is ready', () => {
      // Act
      const { effects } = step(joined(), {
        type: 'tick',
        snapshot: snapshot(
          3000,
          { paused: true },
          { mediaId: 'ep1', ready: false },
        ),
      });

      // Assert
      expect(withoutPings(effects)).toEqual([]);
    });

    it('loads a different media when the room switches', () => {
      // Arrange
      const switched = step(joined(), {
        type: 'message',
        now: 2000,
        msg: {
          t: 'playback',
          playback: {
            ...playingEp1,
            seq: 6,
            mediaId: 'ep2',
            paused: true,
            anchorVideoTime: 0,
          },
        },
      }).state;

      // Act
      const { effects } = step(switched, {
        type: 'tick',
        snapshot: snapshot(2250),
      });

      // Assert
      expect(withoutPings(effects)).toEqual([
        {
          type: 'player',
          cmd: {
            type: 'load',
            mediaId: 'ep2',
            url: '/media/ep2.m3u8',
            startAt: 0,
          },
        },
      ]);
    });
  });

  describe('user intents', () => {
    it('applies play optimistically and sends it with an id', () => {
      // Arrange
      const state = joined({ ...playingEp1, paused: true });

      // Act
      const { state: next, effects } = step(state, {
        type: 'intent',
        intent: { action: 'play' },
        now: 2000,
      });

      // Assert
      expect(next.playback).toMatchObject({
        paused: false,
        anchorVideoTime: 100,
        anchorServerTime: 2000,
      });
      expect(next.pending).toEqual([{ id: 0, intent: { action: 'play' } }]);
      expect(effects).toEqual([
        {
          type: 'send',
          msg: { t: 'intent', id: 0, intent: { action: 'play' } },
        },
      ]);
    });

    it('seeks locally on the next tick after a seek intent', () => {
      // Arrange
      const sought = step(joined(), {
        type: 'intent',
        intent: { action: 'seek', time: 500 },
        now: 2000,
      });

      // Act
      const { effects } = step(sought.state, {
        type: 'tick',
        snapshot: snapshot(2250),
      });

      // Assert
      expect(sought.effects).toEqual([
        {
          type: 'send',
          msg: { t: 'intent', id: 0, intent: { action: 'seek', time: 500 } },
        },
      ]);
      expect(effects).toContainEqual({
        type: 'player',
        cmd: { type: 'seek', time: 500.25 },
      });
    });

    it.each([
      {
        name: 'disconnected',
        state: () => step(joined(), { type: 'disconnected', now: 2000 }).state,
      },
      {
        name: 'not ready',
        state: () =>
          step(joined(), {
            type: 'tick',
            snapshot: snapshot(2000, {}, { mediaId: 'ep1', ready: false }),
          }).state,
      },
      {
        name: 'not joined',
        state: () => run([{ type: 'connected', now: 0 }]).state,
      },
    ])('ignores a pause while $name', ({ state }) => {
      // Arrange
      const before = state();

      // Act
      const { state: after, effects } = step(before, {
        type: 'intent',
        intent: { action: 'pause' },
        now: 3000,
      });

      // Assert
      expect(after).toBe(before);
      expect(effects).toEqual([]);
    });

    it('ignores an unknown media id', () => {
      // Arrange
      const before = joined();

      // Act
      const { state, effects } = step(before, {
        type: 'intent',
        intent: { action: 'media', mediaId: 'nope' },
        now: 3000,
      });

      // Assert
      expect(state).toBe(before);
      expect(effects).toEqual([]);
    });

    it('allows selecting media before any is chosen', () => {
      // Arrange
      const idle = joined({ ...playingEp1, mediaId: null, paused: true });

      // Act
      const { effects } = step(idle, {
        type: 'intent',
        intent: { action: 'media', mediaId: 'ep2' },
        now: 3000,
      });

      // Assert
      expect(effects).toEqual([
        {
          type: 'send',
          msg: {
            t: 'intent',
            id: 0,
            intent: { action: 'media', mediaId: 'ep2' },
          },
        },
      ]);
    });
  });

  describe('stalls', () => {
    it('reports a stall after no progress with too little data', () => {
      // Arrange
      let state = joined();
      state = step(state, {
        type: 'tick',
        snapshot: snapshot(2000, { currentTime: 101, readyState: 2 }),
      }).state;

      // Act
      const early = step(state, {
        type: 'tick',
        snapshot: snapshot(2250, { currentTime: 101, readyState: 2 }),
      });
      const late = step(early.state, {
        type: 'tick',
        snapshot: snapshot(2500, { currentTime: 101, readyState: 2 }),
      });

      // Assert
      expect(
        early.effects.some((e) => e.type === 'send' && e.msg.t === 'intent'),
      ).toBe(false);
      expect(late.effects).toContainEqual({
        type: 'send',
        msg: { t: 'intent', id: 0, intent: { action: 'stall', on: true } },
      });
      expect(late.state.stall.reported).toBe(true);
    });

    it('reports recovery once progress resumes', () => {
      // Arrange
      let state = joined();
      for (const now of [2000, 2250, 2500]) {
        state = step(state, {
          type: 'tick',
          snapshot: snapshot(now, { currentTime: 101, readyState: 2 }),
        }).state;
      }

      // Act
      const { state: next, effects } = step(state, {
        type: 'tick',
        snapshot: snapshot(2750, { currentTime: 101.2 }),
      });

      // Assert
      expect(effects).toContainEqual({
        type: 'send',
        msg: { t: 'intent', id: 1, intent: { action: 'stall', on: false } },
      });
      expect(next.stall.reported).toBe(false);
    });

    it('pauses and waits while someone else is stalled', () => {
      // Arrange
      const waiting = step(joined(), {
        type: 'message',
        now: 2000,
        msg: {
          t: 'playback',
          playback: {
            ...playingEp1,
            seq: 6,
            waiting: 1,
            anchorVideoTime: 101,
            anchorServerTime: 2000,
          },
        },
      }).state;

      // Act
      const { effects } = step(waiting, {
        type: 'tick',
        snapshot: snapshot(2250, { currentTime: 150 }),
      });

      // Assert
      expect(withoutPings(effects)).toEqual([
        { type: 'player', cmd: { type: 'pause' } },
      ]);
    });
  });

  describe('reconciliation', () => {
    it('plays a paused player when the room is playing', () => {
      // Act
      const { effects } = step(joined(), {
        type: 'tick',
        snapshot: snapshot(2000, { paused: true }),
      });

      // Assert
      expect(withoutPings(effects)).toEqual([
        { type: 'player', cmd: { type: 'play' } },
      ]);
    });

    it('pauses a playing player when the room is paused', () => {
      // Arrange
      const paused = joined({ ...playingEp1, paused: true });

      // Act
      const { effects } = step(paused, {
        type: 'tick',
        snapshot: snapshot(2000, { currentTime: 100 }),
      });

      // Assert
      expect(withoutPings(effects)).toEqual([
        { type: 'player', cmd: { type: 'pause' } },
      ]);
    });

    it('stops trying to play after a gesture rejection until the user taps', () => {
      // Arrange
      const rejected = step(joined(), {
        type: 'player',
        event: { type: 'playRejected', reason: 'gesture' },
        now: 2000,
      }).state;

      // Act
      const blocked = step(rejected, {
        type: 'tick',
        snapshot: snapshot(2250, { paused: true }),
      });
      const granted = step(blocked.state, {
        type: 'intent',
        intent: { action: 'gesture' },
        now: 2300,
      }).state;
      const after = step(granted, {
        type: 'tick',
        snapshot: snapshot(2500, { paused: true }),
      });

      // Assert
      expect(withoutPings(blocked.effects)).toEqual([]);
      expect(after.effects).toContainEqual({
        type: 'player',
        cmd: { type: 'play' },
      });
    });

    it('does not restart an ended player unless the room rewound', () => {
      // Arrange
      const state = joined();

      // Act
      const atEnd = step(state, {
        type: 'tick',
        snapshot: snapshot(2000, { ended: true, paused: true }),
      });
      const rewound = step(state, {
        type: 'tick',
        snapshot: snapshot(2000, {
          ended: true,
          paused: true,
          currentTime: 500,
        }),
      });

      // Assert
      expect(withoutPings(atEnd.effects)).toEqual([]);
      expect(withoutPings(rewound.effects)).toEqual([
        { type: 'player', cmd: { type: 'seek', time: 101 } },
      ]);
    });
  });

  describe('visibility', () => {
    it('pings immediately and forgives the stall on becoming visible', () => {
      // Arrange
      let state = joined();
      state = step(state, {
        type: 'tick',
        snapshot: { ...snapshot(2000), visible: false },
      }).state;

      // Act
      const { effects, state: next } = step(state, {
        type: 'tick',
        snapshot: snapshot(60_000, { currentTime: 101, readyState: 2 }),
      });

      // Assert
      expect(effects).toContainEqual({
        type: 'send',
        msg: { t: 'ping', c: 60_000 },
      });
      expect(next.stall.lastProgressAt).toBe(60_000);
    });
  });

  it('starts with sensible defaults', () => {
    expect(initialEngineState('bob')).toMatchObject({
      name: 'bob',
      connection: 'disconnected',
      playback: null,
      gesture: 'unknown',
    });
  });
});
