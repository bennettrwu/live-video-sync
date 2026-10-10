import type { ClientMessage } from '@live-video-sync/sync-protocol';

export type PlayerCommand =
  | { type: 'load'; mediaId: string; url: string; startAt: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'seek'; time: number }
  | { type: 'rate'; rate: number };

export type Effect =
  | { type: 'send'; msg: ClientMessage }
  | { type: 'player'; cmd: PlayerCommand };
