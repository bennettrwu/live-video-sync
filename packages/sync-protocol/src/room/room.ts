import type { LogEntry } from '../log.js';
import type { RoomDefinition } from '../media.js';
import type { Member } from '../member.js';
import type { PlaybackState } from '../playback-state.js';

/** The server's full live picture of one room. Treated as immutable. */
export interface Room {
  definition: RoomDefinition;
  playback: PlaybackState;
  members: ReadonlyMap<string, Member>;
  log: readonly LogEntry[];
  nextLogId: number;
}

/**
 * A fresh room: no media selected, paused, nobody present.
 * @param now server clock, ms
 */
export function createRoom(definition: RoomDefinition, now: number): Room {
  return {
    definition,
    playback: {
      seq: 0,
      mediaId: null,
      paused: true,
      anchorVideoTime: 0,
      anchorServerTime: now,
      waiting: 0,
    },
    members: new Map(),
    log: [],
    nextLogId: 0,
  };
}
