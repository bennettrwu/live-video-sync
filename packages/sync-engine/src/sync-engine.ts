import type { ServerMessage } from '@live-video-sync/sync-protocol';

import type { Effect } from './effects.js';
import { type EngineState, initialEngineState } from './engine-state.js';
import { engineStep } from './engine-step.js';
import type {
  EngineInput,
  PlayerEvent,
  SyncSnapshot,
  UserIntent,
} from './inputs.js';
import { DEFAULT_ENGINE_POLICY, type EnginePolicy } from './policy.js';
import { type EngineView, deriveView } from './view.js';

/**
 * Stateful wrapper over `engineStep`. Every method feeds one input and
 * returns the effects the host must execute, in order.
 */
export class SyncEngine {
  private _state: EngineState;
  private readonly _policy: EnginePolicy;

  /** @param name display name sent in `hello` */
  public constructor(name: string, policy: Partial<EnginePolicy> = {}) {
    this._state = initialEngineState(name);
    this._policy = { ...DEFAULT_ENGINE_POLICY, ...policy };
  }

  public tick(snapshot: SyncSnapshot): Effect[] {
    return this._step({ type: 'tick', snapshot });
  }

  public onMessage(msg: ServerMessage, now: number): Effect[] {
    return this._step({ type: 'message', msg, now });
  }

  public onPlayerEvent(event: PlayerEvent, now: number): Effect[] {
    return this._step({ type: 'player', event, now });
  }

  public intent(intent: UserIntent, now: number): Effect[] {
    return this._step({ type: 'intent', intent, now });
  }

  public setConnected(connected: boolean, now: number): Effect[] {
    return this._step({ type: connected ? 'connected' : 'disconnected', now });
  }

  public view(): EngineView {
    return deriveView(this._state);
  }

  public get state(): EngineState {
    return this._state;
  }

  private _step(input: EngineInput): Effect[] {
    const [next, effects] = engineStep(this._state, input, this._policy);
    this._state = next;
    return effects;
  }
}
