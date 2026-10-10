import type { StallTracker } from './engine-state.js';
import type { SyncSnapshot } from './inputs.js';

/** Tracker that treats `now` as the last moment of progress. */
export function resetStallTracker(
  tracker: StallTracker,
  now: number,
  currentTime: number,
): StallTracker {
  return { ...tracker, lastProgressAt: now, lastTime: currentTime };
}

/**
 * Advances the tracker with one player sample. A stall is playback that is
 * not paused, has too little data to play, and has made no progress for
 * `stallMs`.
 * @returns the updated tracker and whether the player is stalled right now
 */
export function trackProgress(
  tracker: StallTracker,
  player: SyncSnapshot['player'],
  now: number,
  stallMs: number,
): { tracker: StallTracker; stalled: boolean } {
  const playing = !player.paused && !player.ended;
  const progressed = player.currentTime !== tracker.lastTime;
  const lastProgressAt = !playing || progressed ? now : tracker.lastProgressAt;

  const stalled =
    playing && player.readyState < 3 && now - lastProgressAt >= stallMs;

  return {
    tracker: {
      ...tracker,
      lastProgressAt,
      lastTime: player.currentTime,
      since: stalled ? (tracker.since ?? now) : null,
    },
    stalled,
  };
}
