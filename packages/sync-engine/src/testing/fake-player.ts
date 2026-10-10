import type { PlayerCommand } from '../effects.js';
import type { PlayerEvent, SyncSnapshot } from '../inputs.js';

export interface ScheduledStall {
  atVideoTime: number;
  forMs: number;
}

export interface FakePlayerOptions {
  autoplay?: 'allow' | 'rejectUntilGesture';
  loadLatencyMs?: number;
  stalls?: ScheduledStall[];
  durationS?: number;
}

/**
 * A deterministic model of a `<video>` behind an adapter: position advances
 * at `rate` while playing, loading takes time, scheduled stalls freeze the
 * position with too little data to play, and play can be refused until a
 * user gesture.
 */
export class FakePlayer {
  public readonly commands: PlayerCommand[] = [];

  private readonly _autoplay: 'allow' | 'rejectUntilGesture';
  private readonly _loadLatencyMs: number;
  private readonly _durationS: number | null;
  private _pendingStalls: ScheduledStall[];

  private _loaded: { mediaId: string; readyAt: number } | null = null;
  private _currentTime = 0;
  private _paused = true;
  private _rate = 1;
  private _ended = false;
  private _stalledUntil: number | null = null;
  private _gestureGranted = false;

  public constructor(options: FakePlayerOptions = {}) {
    this._autoplay = options.autoplay ?? 'allow';
    this._loadLatencyMs = options.loadLatencyMs ?? 0;
    this._durationS = options.durationS ?? null;
    this._pendingStalls = [...(options.stalls ?? [])];
  }

  public get currentTime(): number {
    return this._currentTime;
  }

  public get paused(): boolean {
    return this._paused;
  }

  public get rate(): number {
    return this._rate;
  }

  /**
   * Runs one command as the adapter would.
   * @returns events the adapter would report back
   */
  public exec(cmd: PlayerCommand, now: number): PlayerEvent[] {
    this.commands.push(cmd);

    switch (cmd.type) {
      case 'load':
        this._loaded = {
          mediaId: cmd.mediaId,
          readyAt: now + this._loadLatencyMs,
        };
        this._currentTime = cmd.startAt;
        this._paused = true;
        this._ended = false;
        this._stalledUntil = null;
        return [];
      case 'play':
        if (this._autoplay === 'rejectUntilGesture' && !this._gestureGranted) {
          return [{ type: 'playRejected', reason: 'gesture' }];
        }
        this._paused = false;
        return [];
      case 'pause':
        this._paused = true;
        return [];
      case 'seek':
        this._currentTime = cmd.time;
        this._ended = false;
        return [];
      case 'rate':
        this._rate = cmd.rate;
        return [];
    }
  }

  public snapshot(now: number): Pick<SyncSnapshot, 'loaded' | 'player'> {
    const loaded =
      this._loaded === null
        ? null
        : { mediaId: this._loaded.mediaId, ready: now >= this._loaded.readyAt };

    return {
      loaded,
      player: {
        currentTime: this._currentTime,
        paused: this._paused,
        rate: this._rate,
        readyState: this._readyState(now),
        ended: this._ended,
      },
    };
  }

  /** Moves playback forward through one slice of time. */
  public advance(from: number, to: number): void {
    if (this._stalledUntil !== null) {
      if (to >= this._stalledUntil) this._stalledUntil = null;
      return;
    }
    if (this._paused || this._ended || !this._isReady(from)) return;

    const next = this._currentTime + ((to - from) / 1000) * this._rate;
    const stall = this._pendingStalls.find(
      (s) => s.atVideoTime > this._currentTime && s.atVideoTime <= next,
    );
    if (stall !== undefined) {
      this._pendingStalls = this._pendingStalls.filter((s) => s !== stall);
      this._currentTime = stall.atVideoTime;
      this._stalledUntil = to + stall.forMs;
      return;
    }

    if (this._durationS !== null && next >= this._durationS) {
      this._currentTime = this._durationS;
      this._ended = true;
      this._paused = true;
      return;
    }
    this._currentTime = next;
  }

  /** Simulates the user tapping: play is allowed from now on and runs once. */
  public grantGesture(now: number): PlayerEvent[] {
    this._gestureGranted = true;
    return this.exec({ type: 'play' }, now);
  }

  /** Simulates the OS pausing media, e.g. a locked phone. */
  public suspend(): void {
    this._paused = true;
  }

  private _isReady(now: number): boolean {
    return this._loaded !== null && now >= this._loaded.readyAt;
  }

  private _readyState(now: number): 0 | 1 | 2 | 3 | 4 {
    if (this._loaded === null) return 0;
    if (!this._isReady(now)) return 1;
    if (this._stalledUntil !== null) return 2;
    return 4;
  }
}
