import type { ServerMessage } from '@live-video-sync/sync-protocol';

import type { RoomConnection } from './room-socket.js';

/** Open sockets grouped by room code. */
export class ConnectionRegistry {
  private readonly _rooms = new Map<string, Map<string, RoomConnection>>();

  public add(code: string, connection: RoomConnection): void {
    let connections = this._rooms.get(code);
    if (connections === undefined) {
      connections = new Map();
      this._rooms.set(code, connections);
    }
    connections.set(connection.id, connection);
  }

  public remove(code: string, connectionId: string): void {
    const connections = this._rooms.get(code);
    if (connections === undefined) return;

    connections.delete(connectionId);
    if (connections.size === 0) this._rooms.delete(code);
  }

  public get(code: string, connectionId: string): RoomConnection | undefined {
    return this._rooms.get(code)?.get(connectionId);
  }

  public count(code: string): number {
    return this._rooms.get(code)?.size ?? 0;
  }

  /**
   * Sends to every connection in the room, optionally skipping one.
   */
  public broadcast(
    code: string,
    message: ServerMessage,
    excludeConnectionId?: string,
  ): void {
    const connections = this._rooms.get(code);
    if (connections === undefined) return;

    for (const connection of connections.values()) {
      if (connection.id === excludeConnectionId) continue;
      connection.send(message);
    }
  }
}
