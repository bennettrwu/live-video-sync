import { type Static, Type } from 'typebox';

/**
 * The shared playback anchor: which media, playing or paused, and the position
 * at a known server time. Only the server mutates it, bumping `seq` each time.
 */
export const PlaybackStateSchema = Type.Object({
  seq: Type.Integer({ minimum: 0 }),
  mediaId: Type.Union([Type.String(), Type.Null()]),
  paused: Type.Boolean(),
  anchorVideoTime: Type.Number({ minimum: 0 }),
  anchorServerTime: Type.Number(),
  waiting: Type.Integer({ minimum: 0 }),
});
export type PlaybackState = Static<typeof PlaybackStateSchema>;

/**
 * Media position at a given server time. The clock runs only while playing
 * and nobody is waiting; otherwise the position is frozen at the anchor.
 * @param serverTime server clock, ms
 * @returns position in seconds
 */
export function positionAt(
  playback: PlaybackState,
  serverTime: number,
): number {
  if (playback.paused || playback.waiting > 0) return playback.anchorVideoTime;
  return (
    playback.anchorVideoTime + (serverTime - playback.anchorServerTime) / 1000
  );
}
