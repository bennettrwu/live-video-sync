import {
  type ClientMessage,
  DEFAULT_ROOM_POLICY,
  type Room,
  type RoomDefinition,
  type RoomEvent,
  type RoomPolicy,
  type ServerMessage,
  createRoom,
  roomReducer,
} from '@live-video-sync/sync-protocol';

export interface FakeServerOptions {
  definition: RoomDefinition;
  /** Server clock minus simulation clock, ms. */
  clockOffsetMs?: number;
  policy?: RoomPolicy;
  tickMs?: number;
}

type Send = (msg: ServerMessage) => void;

/**
 * The sync server's room logic over the real `roomReducer`, driven by a
 * simulation clock: welcomes, pongs, broadcasts on change and on a timer.
 */
export class FakeServer {
  public room: Room;

  private readonly _clockOffsetMs: number;
  private readonly _policy: RoomPolicy;
  private readonly _tickMs: number;
  private readonly _connections = new Map<string, Send>();
  private _nextConnection = 1;
  private _lastTickAt = Number.NEGATIVE_INFINITY;
  private _lastSnapshotAt = Number.NEGATIVE_INFINITY;

  public constructor(
    options: FakeServerOptions,
    private readonly _clock: { now(): number },
  ) {
    this._clockOffsetMs = options.clockOffsetMs ?? 0;
    this._policy = options.policy ?? DEFAULT_ROOM_POLICY;
    this._tickMs = options.tickMs ?? 250;
    this.room = createRoom(options.definition, this.now());
  }

  /** Server clock, ms. */
  public now(): number {
    return this._clock.now() + this._clockOffsetMs;
  }

  /** @returns the new connection id */
  public connect(send: Send): string {
    const connectionId = `conn-${String(this._nextConnection++)}`;
    this._connections.set(connectionId, send);
    return connectionId;
  }

  public disconnect(connectionId: string): void {
    this._connections.delete(connectionId);
    this._apply({ kind: 'leave', connectionId });
  }

  public receive(connectionId: string, msg: ClientMessage): void {
    const send = this._connections.get(connectionId);
    if (send === undefined) return;

    switch (msg.t) {
      case 'hello':
        this._apply({
          kind: 'join',
          member: { connectionId, name: msg.name, stalledSince: null },
        });
        send(this._welcome(connectionId));
        return;
      case 'ping':
        send({ t: 'pong', c: msg.c, s: this.now() });
        return;
      case 'intent':
        this._apply(
          { kind: 'intent', connectionId, intent: msg.intent },
          { connectionId, intentId: msg.id },
        );
        return;
    }
  }

  /** Runs due timers: stall re-evaluation and the periodic snapshot. */
  public tick(): void {
    const now = this.now();
    if (now - this._lastTickAt >= this._tickMs) {
      this._lastTickAt = now;
      this._apply({ kind: 'tick' });
    }
    if (now - this._lastSnapshotAt >= this._policy.snapshotMs) {
      this._lastSnapshotAt = now;
      this._broadcast({ t: 'playback', playback: this.room.playback });
    }
  }

  private _apply(
    event: RoomEvent,
    cause?: { connectionId: string; intentId: number },
  ): void {
    const before = this.room;
    const after = roomReducer(before, event, this.now(), this._policy);
    if (after === before) return;
    this.room = after;

    if (after.playback.seq !== before.playback.seq) {
      this._broadcast(
        cause === undefined
          ? { t: 'playback', playback: after.playback }
          : { t: 'playback', playback: after.playback, cause },
      );
    }
    if (after.members !== before.members) {
      this._broadcast({ t: 'members', members: [...after.members.values()] });
    }
    for (const entry of after.log) {
      if (entry.id >= before.nextLogId) this._broadcast({ t: 'log', entry });
    }
  }

  private _welcome(connectionId: string): ServerMessage {
    const { definition, playback, members, log } = this.room;
    return {
      t: 'welcome',
      you: { connectionId },
      room: { code: definition.code, name: definition.name },
      media: definition.media,
      members: [...members.values()],
      playback,
      log: [...log],
    };
  }

  private _broadcast(msg: ServerMessage): void {
    for (const send of this._connections.values()) send(msg);
  }
}
