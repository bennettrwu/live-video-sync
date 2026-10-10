import { describe, expect, it } from 'vitest';

import type { Member } from '#src/member.js';
import { positionAt } from '#src/playback-state.js';
import { DEFAULT_ROOM_POLICY } from '#src/policy.js';
import type { RoomEvent } from '#src/room/room-events.js';
import { roomReducer } from '#src/room/room-reducer.js';
import { type Room, createRoom } from '#src/room/room.js';

const definition = {
  code: 'abc',
  name: 'Movie night',
  media: [
    { id: 'ep1', name: 'Episode 1', url: '/media/ep1.m3u8' },
    { id: 'ep2', name: 'Episode 2', url: '/media/ep2.m3u8' },
  ],
};

function member(name: string): Member {
  return { connectionId: `conn-${name}`, name, stalledSince: null };
}

function intent(
  name: string,
  intent: Extract<RoomEvent, { kind: 'intent' }>['intent'],
): RoomEvent {
  return { kind: 'intent', connectionId: `conn-${name}`, intent };
}

/** Alice and Bob present, episode 1 playing from t=0 at server time 1000. */
function playingRoom(): Room {
  let room = createRoom(definition, 0);
  room = roomReducer(room, { kind: 'join', member: member('alice') }, 10);
  room = roomReducer(room, { kind: 'join', member: member('bob') }, 20);
  room = roomReducer(
    room,
    intent('alice', { action: 'media', mediaId: 'ep1' }),
    500,
  );
  return roomReducer(room, intent('alice', { action: 'play' }), 1000);
}

describe('roomReducer', () => {
  describe('membership', () => {
    it('adds a member and logs the join without touching playback', () => {
      // Arrange
      const room = createRoom(definition, 0);

      // Act
      const next = roomReducer(
        room,
        { kind: 'join', member: member('alice') },
        10,
      );

      // Assert
      expect([...next.members.keys()]).toEqual(['conn-alice']);
      expect(next.playback).toBe(room.playback);
      expect(next.log.at(-1)).toMatchObject({
        name: 'alice',
        event: { kind: 'join' },
      });
    });

    it('pauses when the last member leaves', () => {
      // Arrange
      const room = playingRoom();
      const afterAlice = roomReducer(
        room,
        { kind: 'leave', connectionId: 'conn-alice' },
        2000,
      );

      // Act
      const afterBob = roomReducer(
        afterAlice,
        { kind: 'leave', connectionId: 'conn-bob' },
        3000,
      );

      // Assert
      expect(afterAlice.playback.paused).toBe(false);
      expect(afterBob.playback.paused).toBe(true);
      expect(afterBob.playback.anchorVideoTime).toBe(2);
      expect(afterBob.log.at(-1)).toMatchObject({
        name: 'bob',
        event: { kind: 'leave' },
      });
    });

    it('ignores a leave from an unknown connection', () => {
      // Arrange
      const room = playingRoom();

      // Act
      const next = roomReducer(
        room,
        { kind: 'leave', connectionId: 'ghost' },
        2000,
      );

      // Assert
      expect(next).toBe(room);
    });
  });

  describe('play and pause', () => {
    it('ignores play before any media is selected', () => {
      // Arrange
      let room = createRoom(definition, 0);
      room = roomReducer(room, { kind: 'join', member: member('alice') }, 10);

      // Act
      const next = roomReducer(room, intent('alice', { action: 'play' }), 20);

      // Assert
      expect(next).toBe(room);
    });

    it('pauses at the current position and bumps seq', () => {
      // Arrange
      const room = playingRoom();

      // Act
      const next = roomReducer(room, intent('bob', { action: 'pause' }), 4000);

      // Assert
      expect(next.playback).toMatchObject({
        paused: true,
        anchorVideoTime: 3,
        anchorServerTime: 4000,
        seq: room.playback.seq + 1,
      });
      expect(next.log.at(-1)).toMatchObject({
        name: 'bob',
        event: { kind: 'pause', at: 3 },
      });
    });

    it('ignores a redundant play or pause', () => {
      // Arrange
      const room = playingRoom();

      // Act
      const next = roomReducer(room, intent('bob', { action: 'play' }), 4000);

      // Assert
      expect(next).toBe(room);
    });

    it('ignores intents from a connection that is not a member', () => {
      // Arrange
      const room = playingRoom();

      // Act
      const next = roomReducer(
        room,
        intent('mallory', { action: 'pause' }),
        4000,
      );

      // Assert
      expect(next).toBe(room);
    });
  });

  describe('seek', () => {
    it('moves the anchor and logs from and to', () => {
      // Arrange
      const room = playingRoom();

      // Act
      const next = roomReducer(
        room,
        intent('alice', { action: 'seek', time: 42 }),
        3000,
      );

      // Assert
      expect(positionAt(next.playback, 3000)).toBe(42);
      expect(positionAt(next.playback, 4000)).toBe(43);
      expect(next.log.at(-1)).toMatchObject({
        event: { kind: 'seek', from: 2, to: 42 },
      });
    });

    it('clamps negative times to zero', () => {
      // Act
      const next = roomReducer(
        playingRoom(),
        intent('alice', { action: 'seek', time: -5 }),
        3000,
      );

      // Assert
      expect(next.playback.anchorVideoTime).toBe(0);
    });
  });

  describe('media', () => {
    it('switches media paused at zero and clears stalls', () => {
      // Arrange
      let room = playingRoom();
      room = roomReducer(
        room,
        intent('bob', { action: 'stall', on: true }),
        2000,
      );

      // Act
      const next = roomReducer(
        room,
        intent('alice', { action: 'media', mediaId: 'ep2' }),
        3000,
      );

      // Assert
      expect(next.playback).toMatchObject({
        mediaId: 'ep2',
        paused: true,
        anchorVideoTime: 0,
        waiting: 0,
      });
      expect(next.members.get('conn-bob')?.stalledSince).toBeNull();
      expect(next.log.at(-1)).toMatchObject({
        event: { kind: 'media', mediaId: 'ep2' },
      });
    });

    it('ignores an unknown media id', () => {
      // Arrange
      const room = playingRoom();

      // Act
      const next = roomReducer(
        room,
        intent('alice', { action: 'media', mediaId: 'nope' }),
        3000,
      );

      // Assert
      expect(next).toBe(room);
    });
  });

  describe('stalls and waiting', () => {
    const { waitAfterMs, stallExpireMs } = DEFAULT_ROOM_POLICY;

    it('marks the member stalled immediately but does not freeze the clock yet', () => {
      // Act
      const next = roomReducer(
        playingRoom(),
        intent('bob', { action: 'stall', on: true }),
        2000,
      );

      // Assert
      expect(next.members.get('conn-bob')?.stalledSince).toBe(2000);
      expect(next.playback.waiting).toBe(0);
      expect(next.log.at(-1)).toMatchObject({
        name: 'bob',
        event: { kind: 'stall' },
      });
    });

    it('freezes the clock once the stall is old enough', () => {
      // Arrange
      const stalled = roomReducer(
        playingRoom(),
        intent('bob', { action: 'stall', on: true }),
        2000,
      );

      // Act
      const waiting = roomReducer(
        stalled,
        { kind: 'tick' },
        2000 + waitAfterMs,
      );

      // Assert
      expect(waiting.playback.waiting).toBe(1);
      expect(waiting.playback.seq).toBe(stalled.playback.seq + 1);
      expect(positionAt(waiting.playback, 10_000)).toBe(
        positionAt(stalled.playback, 2000 + waitAfterMs),
      );
    });

    it('resumes from the frozen position when the member recovers', () => {
      // Arrange
      let room = roomReducer(
        playingRoom(),
        intent('bob', { action: 'stall', on: true }),
        2000,
      );
      room = roomReducer(room, { kind: 'tick' }, 2000 + waitAfterMs);
      const frozenAt = positionAt(room.playback, 9000);

      // Act
      const next = roomReducer(
        room,
        intent('bob', { action: 'stall', on: false }),
        9000,
      );

      // Assert
      expect(next.playback.waiting).toBe(0);
      expect(positionAt(next.playback, 9000)).toBe(frozenAt);
      expect(positionAt(next.playback, 10_000)).toBe(frozenAt + 1);
      expect(next.log.at(-1)).toMatchObject({
        event: { kind: 'recovered', afterMs: 7000 },
      });
    });

    it('ignores a stall report that does not change anything', () => {
      // Arrange
      const room = playingRoom();

      // Act
      const next = roomReducer(
        room,
        intent('bob', { action: 'stall', on: false }),
        2000,
      );

      // Assert
      expect(next).toBe(room);
    });

    it('stops waiting on a member whose stall has expired', () => {
      // Arrange
      let room = roomReducer(
        playingRoom(),
        intent('bob', { action: 'stall', on: true }),
        2000,
      );
      room = roomReducer(room, { kind: 'tick' }, 2000 + waitAfterMs);

      // Act
      const next = roomReducer(room, { kind: 'tick' }, 2000 + stallExpireMs);

      // Assert
      expect(next.playback.waiting).toBe(0);
      expect(next.playback.paused).toBe(false);
    });

    it('drops the waiter when they leave', () => {
      // Arrange
      let room = roomReducer(
        playingRoom(),
        intent('bob', { action: 'stall', on: true }),
        2000,
      );
      room = roomReducer(room, { kind: 'tick' }, 2000 + waitAfterMs);

      // Act
      const next = roomReducer(
        room,
        { kind: 'leave', connectionId: 'conn-bob' },
        5000,
      );

      // Assert
      expect(next.playback.waiting).toBe(0);
    });
  });

  describe('log', () => {
    it('keeps only the newest entries up to the limit', () => {
      // Arrange
      const policy = { ...DEFAULT_ROOM_POLICY, logLimit: 3 };
      let room = createRoom(definition, 0);
      room = roomReducer(
        room,
        { kind: 'join', member: member('alice') },
        1,
        policy,
      );
      room = roomReducer(
        room,
        intent('alice', { action: 'media', mediaId: 'ep1' }),
        2,
        policy,
      );

      // Act
      for (let t = 10; t < 60; t += 10) {
        room = roomReducer(
          room,
          intent('alice', { action: 'seek', time: t }),
          t,
          policy,
        );
      }

      // Assert
      expect(room.log).toHaveLength(3);
      expect(room.log.map((e) => e.id)).toEqual([4, 5, 6]);
    });
  });
});
