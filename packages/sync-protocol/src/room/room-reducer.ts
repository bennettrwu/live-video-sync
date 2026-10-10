import type { LogEvent } from '../log.js';
import type { Member } from '../member.js';
import type { SharedIntent } from '../messages.js';
import { type PlaybackState, positionAt } from '../playback-state.js';
import { DEFAULT_ROOM_POLICY, type RoomPolicy } from '../policy.js';
import type { RoomEvent } from './room-events.js';
import type { Room } from './room.js';

/**
 * Applies one event to a room. Pure: returns the same reference when nothing
 * changed, otherwise a new room with a bumped playback `seq` if playback
 * changed. The `waiting` count is recomputed on every event.
 * @param now server clock, ms
 */
export function roomReducer(
  room: Room,
  event: RoomEvent,
  now: number,
  policy: RoomPolicy = DEFAULT_ROOM_POLICY,
): Room {
  const next = applyEvent(room, event, now, policy);
  return refreshWaiting(next, now, policy);
}

function applyEvent(
  room: Room,
  event: RoomEvent,
  now: number,
  policy: RoomPolicy,
): Room {
  switch (event.kind) {
    case 'join':
      return join(room, event.member, now, policy);
    case 'leave':
      return leave(room, event.connectionId, now, policy);
    case 'intent':
      return applyIntent(room, event.connectionId, event.intent, now, policy);
    case 'tick':
      return room;
  }
}

function join(
  room: Room,
  member: Member,
  now: number,
  policy: RoomPolicy,
): Room {
  const members = new Map(room.members);
  members.set(member.connectionId, member);
  return appendLog({ ...room, members }, member, { kind: 'join' }, now, policy);
}

function leave(
  room: Room,
  connectionId: string,
  now: number,
  policy: RoomPolicy,
): Room {
  const member = room.members.get(connectionId);
  if (member === undefined) return room;

  const members = new Map(room.members);
  members.delete(connectionId);
  let next = appendLog(
    { ...room, members },
    member,
    { kind: 'leave' },
    now,
    policy,
  );

  if (members.size === 0 && !next.playback.paused) {
    next = withPlayback(next, now, { paused: true });
  }
  return next;
}

function applyIntent(
  room: Room,
  connectionId: string,
  intent: SharedIntent,
  now: number,
  policy: RoomPolicy,
): Room {
  const member = room.members.get(connectionId);
  if (member === undefined) return room;

  const position = positionAt(room.playback, now);
  switch (intent.action) {
    case 'play': {
      if (room.playback.mediaId === null || !room.playback.paused) return room;
      const next = withPlayback(room, now, { paused: false });
      return appendLog(
        next,
        member,
        { kind: 'play', at: position },
        now,
        policy,
      );
    }
    case 'pause': {
      if (room.playback.paused) return room;
      const next = withPlayback(room, now, { paused: true });
      return appendLog(
        next,
        member,
        { kind: 'pause', at: position },
        now,
        policy,
      );
    }
    case 'seek': {
      if (room.playback.mediaId === null) return room;
      const to = Math.max(0, intent.time);
      const next = withPlayback(room, now, { anchorVideoTime: to });
      return appendLog(
        next,
        member,
        { kind: 'seek', from: position, to },
        now,
        policy,
      );
    }
    case 'media': {
      if (!room.definition.media.some((m) => m.id === intent.mediaId)) {
        return room;
      }
      const members = new Map<string, Member>();
      for (const [id, m] of room.members) {
        members.set(id, { ...m, stalledSince: null });
      }
      const next = withPlayback({ ...room, members }, now, {
        mediaId: intent.mediaId,
        anchorVideoTime: 0,
        paused: true,
      });
      return appendLog(
        next,
        member,
        { kind: 'media', mediaId: intent.mediaId },
        now,
        policy,
      );
    }
    case 'stall':
      return applyStall(room, member, intent.on, now, policy);
  }
}

function applyStall(
  room: Room,
  member: Member,
  on: boolean,
  now: number,
  policy: RoomPolicy,
): Room {
  if (on === (member.stalledSince !== null)) return room;

  const members = new Map(room.members);
  members.set(member.connectionId, {
    ...member,
    stalledSince: on ? now : null,
  });
  const event: LogEvent = on
    ? { kind: 'stall' }
    : { kind: 'recovered', afterMs: now - (member.stalledSince ?? now) };
  return appendLog({ ...room, members }, member, event, now, policy);
}

/**
 * Recounts members whose stall is old enough to freeze the clock but not so
 * old that they are presumed stuck. Any change re-anchors playback.
 */
function refreshWaiting(room: Room, now: number, policy: RoomPolicy): Room {
  let waiting = 0;
  for (const member of room.members.values()) {
    if (member.stalledSince === null) continue;
    const age = now - member.stalledSince;
    if (age >= policy.waitAfterMs && age < policy.stallExpireMs) waiting++;
  }

  if (waiting === room.playback.waiting) return room;
  return withPlayback(room, now, { waiting });
}

/** Re-anchors at `now`, applies the change, and bumps `seq`. */
function withPlayback(
  room: Room,
  now: number,
  change: Partial<Omit<PlaybackState, 'seq'>>,
): Room {
  const anchored: PlaybackState = {
    ...room.playback,
    anchorVideoTime: positionAt(room.playback, now),
    anchorServerTime: now,
  };
  return {
    ...room,
    playback: { ...anchored, ...change, seq: room.playback.seq + 1 },
  };
}

function appendLog(
  room: Room,
  member: Member,
  event: LogEvent,
  now: number,
  policy: RoomPolicy,
): Room {
  const entry = {
    id: room.nextLogId,
    at: now,
    connectionId: member.connectionId,
    name: member.name,
    event,
  };
  const log = [...room.log, entry].slice(-policy.logLimit);
  return { ...room, log, nextLogId: room.nextLogId + 1 };
}
