import type {
  ClientMessage,
  ServerMessage,
} from '@live-video-sync/sync-protocol';

/** What the service needs from a member's socket. */
export interface RoomConnection {
  readonly id: string;
  send(message: ServerMessage): void;
  close(code?: number, reason?: string): void;
}

/** What the controller needs: a connection it can also listen to. */
export interface RoomSocket extends RoomConnection {
  onMessage(listener: (message: ClientMessage) => void): void;
  onClose(listener: (code: number, reason: string) => void): void;
}
