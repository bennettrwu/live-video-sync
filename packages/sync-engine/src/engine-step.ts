import {
  type ClientMessage,
  type PlaybackState,
  type ServerMessage,
  type SharedIntent,
  positionAt,
} from '@live-video-sync/sync-protocol';

import { bestOffset, recordSample } from './clock-sync.js';
import { correct } from './correction.js';
import type { Effect, PlayerCommand } from './effects.js';
import type { EngineState } from './engine-state.js';
import type {
  EngineInput,
  PlayerEvent,
  SyncSnapshot,
  UserIntent,
} from './inputs.js';
import type { EnginePolicy } from './policy.js';
import { resetStallTracker, trackProgress } from './stall-detector.js';

type Step = [EngineState, Effect[]];

/**
 * Applies one input to the engine. Pure.
 * @returns the next state and the effects the host must execute, in order
 */
export function engineStep(
  state: EngineState,
  input: EngineInput,
  policy: EnginePolicy,
): Step {
  switch (input.type) {
    case 'connected':
      return onConnected(state);
    case 'disconnected':
      return [
        {
          ...state,
          connection: 'disconnected',
          disconnectedAt: input.now,
          pending: [],
        },
        [],
      ];
    case 'message':
      return [onMessage(state, input.msg, input.now, policy), []];
    case 'player':
      return [onPlayerEvent(state, input.event), []];
    case 'intent':
      return onIntent(state, input.intent, input.now);
    case 'tick':
      return onTick(state, input.snapshot, policy);
  }
}

function onConnected(state: EngineState): Step {
  const hello: ClientMessage =
    state.playback === null
      ? { t: 'hello', name: state.name }
      : { t: 'hello', name: state.name, lastSeq: state.playback.seq };

  return [
    {
      ...state,
      connection: 'connected',
      disconnectedAt: null,
      clock: [],
      lastPingAt: Number.NEGATIVE_INFINITY,
    },
    [send(hello)],
  ];
}

function onMessage(
  state: EngineState,
  msg: ServerMessage,
  now: number,
  policy: EnginePolicy,
): EngineState {
  switch (msg.t) {
    case 'welcome':
      return {
        ...state,
        me: { connectionId: msg.you.connectionId },
        room: msg.room,
        media: msg.media,
        members: msg.members,
        playback: msg.playback,
        log: msg.log.slice(-policy.logLimit),
        pending: [],
        error: null,
      };
    case 'playback':
      if (state.playback !== null && msg.playback.seq <= state.playback.seq) {
        return state;
      }
      return { ...state, playback: msg.playback, pending: [] };
    case 'members':
      return { ...state, members: msg.members };
    case 'log':
      return {
        ...state,
        log: [...state.log, msg.entry].slice(-policy.logLimit),
      };
    case 'pong':
      return {
        ...state,
        clock: recordSample(
          state.clock,
          msg.c,
          msg.s,
          now,
          policy.clockSamples,
        ),
      };
    case 'error':
      return msg.code === 'unknown-room'
        ? { ...state, error: msg.message }
        : state;
  }
}

function onPlayerEvent(state: EngineState, event: PlayerEvent): EngineState {
  switch (event.type) {
    case 'playRejected':
      return event.reason === 'gesture'
        ? { ...state, gesture: 'needed' }
        : state;
    case 'error':
      return event.fatal ? { ...state, error: event.message } : state;
  }
}

function onIntent(state: EngineState, intent: UserIntent, now: number): Step {
  if (intent.action === 'gesture') {
    return [{ ...state, gesture: 'granted' }, []];
  }
  if (!canApply(state, intent)) return [state, []];

  const offset = bestOffset(state.clock);
  const playback =
    offset === null || state.playback === null
      ? state.playback
      : applyOptimistically(state.playback, intent, now + offset);
  const correction =
    intent.action === 'seek'
      ? { ...state.correction, lastSeekAt: Number.NEGATIVE_INFINITY }
      : state.correction;

  const [next, effect] = sendIntent({ ...state, playback, correction }, intent);
  return [
    { ...next, pending: [...next.pending, { id: state.nextIntentId, intent }] },
    [effect],
  ];
}

/** Shared controls work only while connected, joined, and the media is ready. */
function canApply(state: EngineState, intent: SharedIntent): boolean {
  if (state.connection !== 'connected' || state.me === null) return false;
  if (state.playback === null) return false;

  if (intent.action === 'media') {
    return state.media.some((item) => item.id === intent.mediaId);
  }
  if (state.playback.mediaId === null) return false;

  const loaded = state.snapshot?.loaded;
  return loaded?.ready === true && loaded.mediaId === state.playback.mediaId;
}

function applyOptimistically(
  playback: PlaybackState,
  intent: SharedIntent,
  serverNow: number,
): PlaybackState {
  const anchored: PlaybackState = {
    ...playback,
    anchorVideoTime: positionAt(playback, serverNow),
    anchorServerTime: serverNow,
  };

  switch (intent.action) {
    case 'play':
      return { ...anchored, paused: false };
    case 'pause':
      return { ...anchored, paused: true };
    case 'seek':
      return { ...anchored, anchorVideoTime: Math.max(0, intent.time) };
    case 'media':
      return {
        ...anchored,
        mediaId: intent.mediaId,
        anchorVideoTime: 0,
        paused: true,
      };
    case 'stall':
      return anchored;
  }
}

function onTick(
  state: EngineState,
  snapshot: SyncSnapshot,
  policy: EnginePolicy,
): Step {
  const { now, player } = snapshot;
  const effects: Effect[] = [];
  let next: EngineState = { ...state, snapshot, visible: snapshot.visible };

  if (snapshot.visible && !state.visible) {
    next = {
      ...next,
      lastPingAt: Number.NEGATIVE_INFINITY,
      stall: resetStallTracker(next.stall, now, player.currentTime),
    };
  }

  if (next.connection === 'disconnected') {
    const since = next.disconnectedAt;
    const graceOver = since !== null && now - since >= policy.disconnectGraceMs;
    if (graceOver && !player.paused) effects.push(command({ type: 'pause' }));
    return [next, effects];
  }

  if (now - next.lastPingAt >= policy.pingMs) {
    effects.push(send({ t: 'ping', c: now }));
    next = { ...next, lastPingAt: now };
  }
  if (!snapshot.visible) return [next, effects];

  const offset = bestOffset(next.clock);
  const playback = next.playback;
  if (playback === null || offset === null || playback.mediaId === null) {
    return [next, effects];
  }
  const serverNow = now + offset;

  const loaded = snapshot.loaded;
  if (loaded?.mediaId !== playback.mediaId) {
    const item = next.media.find((media) => media.id === playback.mediaId);
    if (item !== undefined) {
      effects.push(
        command({
          type: 'load',
          mediaId: item.id,
          url: item.url,
          startAt: positionAt(playback, serverNow),
        }),
      );
    }
    return [
      {
        ...next,
        stall: {
          ...resetStallTracker(next.stall, now, player.currentTime),
          since: null,
          reported: false,
        },
        correction: { rate: 1, lastSeekAt: Number.NEGATIVE_INFINITY },
        drift: 0,
      },
      effects,
    ];
  }
  if (!loaded.ready) return [next, effects];

  const progress = trackProgress(next.stall, player, now, policy.stallMs);
  next = { ...next, stall: progress.tracker };
  if (progress.stalled !== next.stall.reported) {
    next = { ...next, stall: { ...next.stall, reported: progress.stalled } };
    const [sent, effect] = sendIntent(next, {
      action: 'stall',
      on: progress.stalled,
    });
    next = sent;
    effects.push(effect);
  }

  if (next.stall.reported) return [next, effects];

  if (playback.waiting > 0) {
    if (!player.paused) effects.push(command({ type: 'pause' }));
    if (next.correction.rate !== 1) {
      effects.push(command({ type: 'rate', rate: 1 }));
      next = { ...next, correction: { ...next.correction, rate: 1 } };
    }
    return [next, effects];
  }

  const target = positionAt(playback, serverNow);
  next = { ...next, drift: player.currentTime - target };

  if (player.ended) {
    return [...seekBackIfRewound(next, target, now, policy, effects)];
  }

  if (playback.paused !== player.paused) {
    if (playback.paused) effects.push(command({ type: 'pause' }));
    else if (next.gesture !== 'needed') effects.push(command({ type: 'play' }));
  }
  if (!playback.paused && next.gesture === 'needed') return [next, effects];

  const corrected = correct(
    { currentTime: player.currentTime, target, paused: playback.paused },
    next.correction,
    now,
    policy,
  );
  effects.push(...corrected.commands.map(command));
  return [{ ...next, correction: corrected.correction }, effects];
}

/**
 * An ended player stays put unless the room has gone back far enough that
 * playing again makes sense; `play()` on an ended element would restart it.
 */
function seekBackIfRewound(
  state: EngineState,
  target: number,
  now: number,
  policy: EnginePolicy,
  effects: Effect[],
): Step {
  const rewound = state.drift > policy.rateZoneS;
  const canSeek = now - state.correction.lastSeekAt >= policy.seekCooldownMs;
  if (!rewound || !canSeek) return [state, effects];

  effects.push(command({ type: 'seek', time: target }));
  return [{ ...state, correction: { rate: 1, lastSeekAt: now } }, effects];
}

function sendIntent(
  state: EngineState,
  intent: SharedIntent,
): [EngineState, Effect] {
  const id = state.nextIntentId;
  return [
    { ...state, nextIntentId: id + 1 },
    send({ t: 'intent', id, intent }),
  ];
}

function send(msg: ClientMessage): Effect {
  return { type: 'send', msg };
}

function command(cmd: PlayerCommand): Effect {
  return { type: 'player', cmd };
}
