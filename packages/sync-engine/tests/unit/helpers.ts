import type {
  PlaybackState,
  RoomDefinition,
} from '@live-video-sync/sync-protocol';

import type { Effect } from '#src/effects.js';
import { type EngineState, initialEngineState } from '#src/engine-state.js';
import { engineStep } from '#src/engine-step.js';
import type { EngineInput, SyncSnapshot } from '#src/inputs.js';
import { DEFAULT_ENGINE_POLICY } from '#src/policy.js';

export const definition: RoomDefinition = {
  code: 'abc',
  name: 'Movie night',
  media: [
    { id: 'ep1', name: 'Episode 1', url: '/media/ep1.m3u8' },
    { id: 'ep2', name: 'Episode 2', url: '/media/ep2.m3u8' },
  ],
};

export const playingEp1: PlaybackState = {
  seq: 5,
  mediaId: 'ep1',
  paused: false,
  anchorVideoTime: 100,
  anchorServerTime: 1000,
  waiting: 0,
};

export function snapshot(
  now: number,
  overrides: Partial<SyncSnapshot['player']> = {},
  loaded: SyncSnapshot['loaded'] = { mediaId: 'ep1', ready: true },
): SyncSnapshot {
  return {
    now,
    visible: true,
    loaded,
    player: {
      currentTime: 100 + (now - 1000) / 1000,
      paused: false,
      rate: 1,
      readyState: 4,
      ended: false,
      ...overrides,
    },
  };
}

/** Runs inputs in order and returns the final state plus every effect. */
export function run(
  inputs: EngineInput[],
  start: EngineState = initialEngineState('alice'),
): { state: EngineState; effects: Effect[] } {
  let state = start;
  const effects: Effect[] = [];
  for (const input of inputs) {
    const [next, produced] = engineStep(state, input, DEFAULT_ENGINE_POLICY);
    state = next;
    effects.push(...produced);
  }
  return { state, effects };
}

/** Connected, welcomed into a playing room at server time 1000, clock offset 0, media ready. */
export function joined(playback: PlaybackState = playingEp1): EngineState {
  return run([
    { type: 'connected', now: 0 },
    {
      type: 'message',
      now: 0,
      msg: {
        t: 'welcome',
        you: { connectionId: 'conn-1' },
        room: { code: definition.code, name: definition.name },
        media: definition.media,
        members: [
          { connectionId: 'conn-1', name: 'alice', stalledSince: null },
        ],
        playback,
        log: [],
      },
    },
    { type: 'message', now: 0, msg: { t: 'pong', c: 0, s: 0 } },
    { type: 'tick', snapshot: snapshot(1000) },
  ]).state;
}

export function step(state: EngineState, input: EngineInput) {
  const [next, effects] = engineStep(state, input, DEFAULT_ENGINE_POLICY);
  return { state: next, effects };
}

/** Effects minus the periodic ping, which most assertions do not care about. */
export function withoutPings(effects: Effect[]): Effect[] {
  return effects.filter((e) => !(e.type === 'send' && e.msg.t === 'ping'));
}
