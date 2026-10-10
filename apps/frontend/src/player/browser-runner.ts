import {
  type Effect,
  type EngineView,
  type PlayerEvent,
  SyncEngine,
  type UserIntent,
} from '@live-video-sync/sync-engine';

import type { HlsPlayerAdapter } from './hls-player-adapter.js';
import type { WsTransport } from './ws-transport.js';

const TICK_MS = 250;

/**
 * Wires the engine to real time, the transport, and the player: ticks on an
 * interval, feeds events in, executes the effects that come out.
 */
export class BrowserRunner {
  private readonly _engine: SyncEngine;
  private readonly _transport: WsTransport;
  private readonly _adapter: HlsPlayerAdapter;
  private readonly _viewListeners = new Set<() => void>();
  private readonly _unsubscribe: (() => void)[] = [];

  private _timer: ReturnType<typeof setInterval> | null = null;
  private _view: EngineView;

  public constructor(
    engine: SyncEngine,
    transport: WsTransport,
    adapter: HlsPlayerAdapter,
  ) {
    this._engine = engine;
    this._transport = transport;
    this._adapter = adapter;
    this._view = engine.view();
  }

  public get view(): EngineView {
    return this._view;
  }

  public start(): void {
    this._unsubscribe.push(
      this._transport.subscribe((event) => {
        const now = performance.now();
        if (event.type === 'message') {
          this._run(this._engine.onMessage(event.msg, now));
        } else {
          this._run(this._engine.setConnected(event.type === 'connected', now));
        }
      }),
      this._adapter.onEvent((event: PlayerEvent) => {
        this._run(this._engine.onPlayerEvent(event, performance.now()));
      }),
    );

    const onVisibilityChange = () => {
      this._tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    this._unsubscribe.push(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    });

    this._timer = setInterval(() => {
      this._tick();
    }, TICK_MS);
    this._transport.connect();
  }

  public stop(): void {
    if (this._timer !== null) clearInterval(this._timer);
    this._timer = null;
    for (const unsubscribe of this._unsubscribe) unsubscribe();
    this._unsubscribe.length = 0;
    this._transport.close();
  }

  public intent(intent: UserIntent): void {
    this._run(this._engine.intent(intent, performance.now()));
  }

  public subscribeView(listener: () => void): () => void {
    this._viewListeners.add(listener);
    return () => this._viewListeners.delete(listener);
  }

  private _tick(): void {
    const effects = this._engine.tick({
      now: performance.now(),
      visible: document.visibilityState === 'visible',
      ...this._adapter.snapshot(),
    });
    this._run(effects);
  }

  private _run(effects: Effect[]): void {
    for (const effect of effects) {
      if (effect.type === 'send') this._transport.send(effect.msg);
      else this._adapter.exec(effect.cmd);
    }

    this._view = this._engine.view();
    for (const listener of this._viewListeners) listener();
  }
}
