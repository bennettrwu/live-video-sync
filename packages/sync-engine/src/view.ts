import type {
  LogEntry,
  MediaItem,
  Member,
} from '@live-video-sync/sync-protocol';

import { bestOffset, bestRtt } from './clock-sync.js';
import type { EngineState } from './engine-state.js';

export type EnginePhase =
  | 'joining'
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'stalled'
  | 'waitingForOthers'
  | 'needsGesture'
  | 'ended'
  | 'reconnecting'
  | 'error';

export interface EngineView {
  phase: EnginePhase;
  controlsEnabled: boolean;
  name: string;
  connectionId: string | null;
  room: { code: string; name: string } | null;
  media: MediaItem[];
  currentMediaId: string | null;
  members: Member[];
  stalledMembers: Member[];
  waiting: boolean;
  log: LogEntry[];
  debug: {
    drift: number;
    rtt: number | null;
    offset: number | null;
    rate: number;
    seq: number;
  };
}

/** The UI-facing projection of engine state. */
export function deriveView(state: EngineState): EngineView {
  const { playback, snapshot } = state;
  const loaded = snapshot?.loaded ?? null;
  const mediaReady =
    playback !== null &&
    loaded !== null &&
    loaded.mediaId === playback.mediaId &&
    loaded.ready;

  return {
    phase: derivePhase(state, mediaReady),
    controlsEnabled:
      state.connection === 'connected' &&
      state.me !== null &&
      playback !== null &&
      (playback.mediaId === null || mediaReady),
    name: state.name,
    connectionId: state.me?.connectionId ?? null,
    room: state.room,
    media: state.media,
    currentMediaId: playback?.mediaId ?? null,
    members: state.members,
    stalledMembers: state.members.filter(
      (member) => member.stalledSince !== null,
    ),
    waiting: playback !== null && playback.waiting > 0,
    log: state.log,
    debug: {
      drift: state.drift,
      rtt: bestRtt(state.clock),
      offset: bestOffset(state.clock),
      rate: state.correction.rate,
      seq: playback?.seq ?? 0,
    },
  };
}

function derivePhase(state: EngineState, mediaReady: boolean): EnginePhase {
  const { playback, snapshot } = state;

  if (state.error !== null) return 'error';
  if (state.connection === 'disconnected') {
    return state.me === null ? 'joining' : 'reconnecting';
  }
  if (state.me === null || playback === null) return 'joining';
  if (playback.mediaId === null) return 'idle';
  if (!mediaReady) return 'loading';
  if (state.gesture === 'needed' && !playback.paused) return 'needsGesture';
  if (playback.waiting > 0 && !state.stall.reported) return 'waitingForOthers';
  if (state.stall.reported) return 'stalled';
  if (snapshot?.player.ended === true) return 'ended';
  return playback.paused ? 'paused' : 'playing';
}
