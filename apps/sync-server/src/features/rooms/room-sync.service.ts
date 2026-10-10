import {
  type Room,
  type RoomEvent,
  type RoomPolicy,
  type ServerMessage,
  type SharedIntent,
  createRoom,
  roomReducer,
} from '@live-video-sync/sync-protocol';

import type { ConnectionRegistry } from './connection.registry.js';
import type { RoomDefinitionRepository } from './room-definition.repository.js';
import type { RoomConnection } from './room-socket.js';
import type { RoomRepository } from './room.repository.js';

const TICK_MS = 250;

interface RoomTimers {
  tick: ReturnType<typeof setInterval>;
  snapshot: ReturnType<typeof setInterval>;
}

interface Cause {
  connectionId: string;
  intentId?: number;
}

/**
 * Applies room events through the reducer and tells connected members what
 * changed. Rooms open lazily on first join and run timers only while someone
 * is connected.
 */
export class RoomSyncService {
  private readonly _definitions: RoomDefinitionRepository;
  private readonly _rooms: RoomRepository;
  private readonly _connections: ConnectionRegistry;
  private readonly _now: () => number;
  private readonly _policy: RoomPolicy;
  private readonly _timers = new Map<string, RoomTimers>();

  public constructor(
    roomDefinitionRepository: RoomDefinitionRepository,
    roomRepository: RoomRepository,
    connectionRegistry: ConnectionRegistry,
    now: () => number,
    roomPolicy: RoomPolicy,
  ) {
    this._definitions = roomDefinitionRepository;
    this._rooms = roomRepository;
    this._connections = connectionRegistry;
    this._now = now;
    this._policy = roomPolicy;
  }

  /**
   * Adds the connection to the room and sends it a `welcome`. Everyone else
   * learns about the new member.
   * @returns false when the room does not exist; an `error` was sent
   */
  public async join(
    code: string,
    connection: RoomConnection,
    name: string,
  ): Promise<boolean> {
    const room = await this._open(code);
    if (room === null) {
      connection.send({
        t: 'error',
        code: 'unknown-room',
        message: `no room with code "${code}"`,
      });
      return false;
    }

    this._connections.add(code, connection);
    const member = { connectionId: connection.id, name, stalledSince: null };
    const joined = this._apply(
      code,
      room,
      { kind: 'join', member },
      undefined,
      connection.id,
    );

    connection.send({
      t: 'welcome',
      you: { connectionId: connection.id },
      room: { code: joined.definition.code, name: joined.definition.name },
      media: joined.definition.media,
      members: [...joined.members.values()],
      playback: joined.playback,
      log: [...joined.log],
    });
    this._ensureTimers(code);
    return true;
  }

  public leave(code: string, connectionId: string): void {
    const room = this._rooms.get(code);
    this._connections.remove(code, connectionId);
    if (room === undefined) return;

    this._apply(code, room, { kind: 'leave', connectionId });
    if (this._connections.count(code) === 0) this._stopTimers(code);
  }

  public handleIntent(
    code: string,
    connectionId: string,
    intentId: number,
    intent: SharedIntent,
  ): void {
    const room = this._rooms.get(code);
    if (room === undefined) return;

    if (intent.action === 'media' && !hasMedia(room, intent.mediaId)) {
      this._connections.get(code, connectionId)?.send({
        t: 'error',
        code: 'unknown-media',
        message: `no media with id "${intent.mediaId}"`,
      });
      return;
    }

    this._apply(
      code,
      room,
      { kind: 'intent', connectionId, intent },
      { connectionId, intentId },
    );
  }

  public handlePing(connection: RoomConnection, clientTime: number): void {
    connection.send({ t: 'pong', c: clientTime, s: this._now() });
  }

  /** Stops every room timer. Called when the server closes. */
  public dispose(): void {
    for (const code of [...this._timers.keys()]) this._stopTimers(code);
  }

  private async _open(code: string): Promise<Room | null> {
    const existing = this._rooms.get(code);
    if (existing !== undefined) return existing;

    const definition = await this._definitions.findByCode(code);
    if (definition === null) return null;

    const room = createRoom(definition, this._now());
    this._rooms.set(code, room);
    return room;
  }

  /**
   * Reduces one event, stores the result, and broadcasts whatever changed.
   * @param excludeConnectionId a member who will get the full picture another way
   */
  private _apply(
    code: string,
    before: Room,
    event: RoomEvent,
    cause?: Cause,
    excludeConnectionId?: string,
  ): Room {
    const after = roomReducer(before, event, this._now(), this._policy);
    if (after === before) return before;
    this._rooms.set(code, after);

    this._broadcastChanges(code, before, after, cause, excludeConnectionId);
    return after;
  }

  private _broadcastChanges(
    code: string,
    before: Room,
    after: Room,
    cause: Cause | undefined,
    excludeConnectionId: string | undefined,
  ): void {
    const send = (message: ServerMessage): void => {
      this._connections.broadcast(code, message, excludeConnectionId);
    };

    if (after.playback.seq !== before.playback.seq) {
      send(
        cause === undefined
          ? { t: 'playback', playback: after.playback }
          : { t: 'playback', playback: after.playback, cause },
      );
    }
    if (membersChanged(before, after)) {
      send({ t: 'members', members: [...after.members.values()] });
    }
    for (const entry of after.log) {
      if (entry.id >= before.nextLogId) send({ t: 'log', entry });
    }
  }

  private _ensureTimers(code: string): void {
    if (this._timers.has(code)) return;

    this._timers.set(code, {
      tick: setInterval(() => {
        const room = this._rooms.get(code);
        if (room !== undefined) this._apply(code, room, { kind: 'tick' });
      }, TICK_MS),
      snapshot: setInterval(() => {
        const room = this._rooms.get(code);
        if (room === undefined) return;
        this._connections.broadcast(code, {
          t: 'playback',
          playback: room.playback,
        });
      }, this._policy.snapshotMs),
    });
  }

  private _stopTimers(code: string): void {
    const timers = this._timers.get(code);
    if (timers === undefined) return;

    clearInterval(timers.tick);
    clearInterval(timers.snapshot);
    this._timers.delete(code);
  }
}

function hasMedia(room: Room, mediaId: string): boolean {
  return room.definition.media.some((item) => item.id === mediaId);
}

function membersChanged(before: Room, after: Room): boolean {
  if (before.members.size !== after.members.size) return true;
  for (const [id, member] of after.members) {
    if (before.members.get(id) !== member) return true;
  }
  return false;
}
