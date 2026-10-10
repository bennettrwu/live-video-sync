import type {
  LogEntry,
  MediaItem,
  Member,
  PlaybackState,
  SharedIntent,
} from '@live-video-sync/sync-protocol';

import type { ClockSyncSamples } from './clock-sync.js';
import type { SyncSnapshot } from './inputs.js';

export interface PendingIntent {
  id: number;
  intent: SharedIntent;
}

export interface StallTracker {
  since: number | null;
  reported: boolean;
  lastProgressAt: number;
  lastTime: number;
}

export interface CorrectionState {
  rate: number;
  lastSeekAt: number;
}

export interface EngineState {
  connection: 'disconnected' | 'connected';
  disconnectedAt: number | null;
  name: string;
  me: { connectionId: string } | null;
  room: { code: string; name: string } | null;
  playback: PlaybackState | null;
  media: MediaItem[];
  members: Member[];
  log: LogEntry[];
  clock: ClockSyncSamples;
  lastPingAt: number;
  nextIntentId: number;
  pending: PendingIntent[];
  stall: StallTracker;
  correction: CorrectionState;
  gesture: 'unknown' | 'needed' | 'granted';
  error: string | null;
  visible: boolean;
  snapshot: SyncSnapshot | null;
  drift: number;
}

/** @param name display name sent in `hello` */
export function initialEngineState(name: string): EngineState {
  return {
    connection: 'disconnected',
    disconnectedAt: null,
    name,
    me: null,
    room: null,
    playback: null,
    media: [],
    members: [],
    log: [],
    clock: [],
    lastPingAt: Number.NEGATIVE_INFINITY,
    nextIntentId: 0,
    pending: [],
    stall: {
      since: null,
      reported: false,
      lastProgressAt: Number.NEGATIVE_INFINITY,
      lastTime: 0,
    },
    correction: { rate: 1, lastSeekAt: Number.NEGATIVE_INFINITY },
    gesture: 'unknown',
    error: null,
    visible: true,
    snapshot: null,
    drift: 0,
  };
}
