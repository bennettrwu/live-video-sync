import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ROOM_POLICY } from '@live-video-sync/sync-protocol';

import { ConnectionRegistry } from '#src/features/rooms/connection.registry.js';
import type { RoomDefinitionRepository } from '#src/features/rooms/room-definition.repository.js';
import { RoomSyncService } from '#src/features/rooms/room-sync.service.js';
import { RoomRepository } from '#src/features/rooms/room.repository.js';
import {
  FakeClock,
  FakeRoomDefinitionRepository,
  FakeRoomSocket,
} from '#tests/utils/fakes.js';

const policy = { ...DEFAULT_ROOM_POLICY, snapshotMs: 2000 };

function setup() {
  const clock = new FakeClock();
  const rooms = new RoomRepository();
  const registry = new ConnectionRegistry();
  const service = new RoomSyncService(
    new FakeRoomDefinitionRepository() as unknown as RoomDefinitionRepository,
    rooms,
    registry,
    clock.now,
    policy,
  );
  return { clock, rooms, registry, service };
}

async function joinedPair() {
  const context = setup();
  const alice = new FakeRoomSocket('alice');
  const bob = new FakeRoomSocket('bob');
  await context.service.join('demo', alice, 'Alice');
  await context.service.join('demo', bob, 'Bob');
  alice.sent.length = 0;
  bob.sent.length = 0;
  return { ...context, alice, bob };
}

describe('RoomSyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('join', () => {
    it('welcomes the joiner with the full picture and tells the others', async () => {
      // Arrange
      const { service, clock } = setup();
      const alice = new FakeRoomSocket('alice');
      const bob = new FakeRoomSocket('bob');
      await service.join('demo', alice, 'Alice');

      // Act
      const ok = await service.join('demo', bob, 'Bob');

      // Assert
      expect(ok).toBe(true);
      const welcome = bob.sentOfType('welcome')[0];
      expect(welcome).toMatchObject({
        you: { connectionId: 'bob' },
        room: { code: 'demo', name: 'Demo room' },
        playback: {
          seq: 0,
          mediaId: null,
          paused: true,
          anchorServerTime: clock.now(),
        },
      });
      expect(welcome?.members.map((m) => m.name)).toEqual(['Alice', 'Bob']);
      expect(welcome?.log.map((e) => e.event.kind)).toEqual(['join', 'join']);
      expect(bob.sentOfType('members')).toHaveLength(0);
      expect(
        alice.sentOfType('members')[0]?.members.map((m) => m.name),
      ).toEqual(['Alice', 'Bob']);
      expect(alice.sentOfType('log')[0]?.entry).toMatchObject({
        name: 'Bob',
        event: { kind: 'join' },
      });
    });

    it('rejects an unknown room', async () => {
      // Arrange
      const { service } = setup();
      const socket = new FakeRoomSocket('x');

      // Act
      const ok = await service.join('nope', socket, 'Nobody');

      // Assert
      expect(ok).toBe(false);
      expect(socket.sent).toEqual([
        {
          t: 'error',
          code: 'unknown-room',
          message: expect.stringContaining('nope'),
        },
      ]);
    });
  });

  describe('intents', () => {
    it('broadcasts playback with the cause to everyone including the sender', async () => {
      // Arrange
      const { service, alice, bob, clock } = await joinedPair();
      service.handleIntent('demo', 'alice', 1, {
        action: 'media',
        mediaId: 'ep1',
      });
      alice.sent.length = 0;
      bob.sent.length = 0;
      clock.advance(100);

      // Act
      service.handleIntent('demo', 'alice', 2, { action: 'play' });

      // Assert
      for (const socket of [alice, bob]) {
        expect(socket.sentOfType('playback')).toEqual([
          {
            t: 'playback',
            playback: expect.objectContaining({
              paused: false,
              mediaId: 'ep1',
            }),
            cause: { connectionId: 'alice', intentId: 2 },
          },
        ]);
        expect(socket.sentOfType('log')[0]?.entry).toMatchObject({
          name: 'Alice',
          event: { kind: 'play' },
        });
      }
    });

    it('answers an unknown media id with an error to the sender only', async () => {
      // Arrange
      const { service, alice, bob } = await joinedPair();

      // Act
      service.handleIntent('demo', 'alice', 1, {
        action: 'media',
        mediaId: 'nope',
      });

      // Assert
      expect(alice.sent).toEqual([
        {
          t: 'error',
          code: 'unknown-media',
          message: expect.stringContaining('nope'),
        },
      ]);
      expect(bob.sent).toEqual([]);
    });

    it('broadcasts members when a stall is reported, and playback once it is old enough', async () => {
      // Arrange
      const { service, alice, bob, clock } = await joinedPair();
      service.handleIntent('demo', 'alice', 1, {
        action: 'media',
        mediaId: 'ep1',
      });
      service.handleIntent('demo', 'alice', 2, { action: 'play' });
      alice.sent.length = 0;

      // Act
      service.handleIntent('demo', 'bob', 1, { action: 'stall', on: true });
      const membersAfterStall = alice.sentOfType('members');
      const playbackAfterStall = alice.sentOfType('playback');
      clock.advance(policy.waitAfterMs);
      vi.advanceTimersByTime(250);

      // Assert
      expect(
        membersAfterStall[0]?.members.find((m) => m.name === 'Bob')
          ?.stalledSince,
      ).toBe(clock.now() - policy.waitAfterMs);
      expect(playbackAfterStall).toHaveLength(0);
      expect(alice.sentOfType('playback').at(-1)?.playback.waiting).toBe(1);
      expect(bob.sentOfType('playback').at(-1)?.playback.waiting).toBe(1);
    });

    it('answers pings with the server clock', async () => {
      // Arrange
      const { service, alice, clock } = await joinedPair();

      // Act
      service.handlePing(alice, 42);

      // Assert
      expect(alice.sent).toEqual([{ t: 'pong', c: 42, s: clock.now() }]);
    });
  });

  describe('leave', () => {
    it('pauses the room when the last member leaves and keeps it in memory', async () => {
      // Arrange
      const { service, rooms, bob, clock } = await joinedPair();
      service.handleIntent('demo', 'alice', 1, {
        action: 'media',
        mediaId: 'ep1',
      });
      service.handleIntent('demo', 'alice', 2, { action: 'play' });
      clock.advance(5000);

      // Act
      service.leave('demo', 'alice');
      const stillPlaying = rooms.get('demo')?.playback.paused;
      service.leave('demo', 'bob');

      // Assert
      expect(stillPlaying).toBe(false);
      expect(rooms.get('demo')?.playback).toMatchObject({
        paused: true,
        anchorVideoTime: 5,
      });
      expect(rooms.get('demo')?.members.size).toBe(0);
      expect(bob.sentOfType('log').at(-1)?.entry).toMatchObject({
        name: 'Alice',
        event: { kind: 'leave' },
      });
    });
  });

  describe('timers', () => {
    it('broadcasts a playback snapshot every snapshot interval while members are present', async () => {
      // Arrange
      const { service, alice } = await joinedPair();

      // Act
      vi.advanceTimersByTime(policy.snapshotMs * 2);
      const whilePresent = alice.sentOfType('playback').length;
      service.leave('demo', 'alice');
      service.leave('demo', 'bob');
      vi.advanceTimersByTime(policy.snapshotMs * 2);

      // Assert
      expect(whilePresent).toBe(2);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('dispose clears timers', async () => {
      // Arrange
      const { service } = await joinedPair();

      // Act
      service.dispose();

      // Assert
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
