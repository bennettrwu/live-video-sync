import type { ServerMessage } from '@live-video-sync/sync-protocol';

/** The local world as sampled by the host on every tick. */
export interface SyncSnapshot {
  /** Host monotonic clock, ms. */
  now: number;
  visible: boolean;
  /** What the adapter has loaded. Set synchronously when a `load` command runs. */
  loaded: { mediaId: string; ready: boolean } | null;
  player: {
    currentTime: number;
    paused: boolean;
    rate: number;
    readyState: 0 | 1 | 2 | 3 | 4;
    ended: boolean;
  };
}

export type PlayerEvent =
  | { type: 'playRejected'; reason: 'gesture' | 'other' }
  | { type: 'error'; fatal: boolean; message: string };

export type UserIntent =
  | { action: 'play' }
  | { action: 'pause' }
  | { action: 'seek'; time: number }
  | { action: 'media'; mediaId: string }
  /** The user tapped the "tap to play" overlay. */
  | { action: 'gesture' };

export type EngineInput =
  | { type: 'tick'; snapshot: SyncSnapshot }
  | { type: 'connected'; now: number }
  | { type: 'disconnected'; now: number }
  | { type: 'message'; msg: ServerMessage; now: number }
  | { type: 'player'; event: PlayerEvent; now: number }
  | { type: 'intent'; intent: UserIntent; now: number };
