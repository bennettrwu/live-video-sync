import { Check } from 'typebox/value';

import {
  type ClientMessage,
  type ServerMessage,
  ServerMessageSchema,
} from '@live-video-sync/sync-protocol';

export type TransportEvent =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'message'; msg: ServerMessage };

export interface WsTransportOptions {
  url: string;
  /** Reconnect delay bounds; delay doubles each failed attempt. */
  reconnectMinMs?: number;
  reconnectMaxMs?: number;
  /** Injectable for tests. */
  createSocket?: (url: string) => WebSocket;
}

/**
 * A WebSocket that reconnects with exponential backoff and validates every
 * inbound frame against the server message schema. Invalid frames are
 * dropped and counted.
 */
export class WsTransport {
  public droppedFrames = 0;

  private readonly _url: string;
  private readonly _minDelay: number;
  private readonly _maxDelay: number;
  private readonly _createSocket: (url: string) => WebSocket;
  private readonly _listeners = new Set<(event: TransportEvent) => void>();

  private _socket: WebSocket | null = null;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _attempt = 0;
  private _closed = false;

  public constructor(options: WsTransportOptions) {
    this._url = options.url;
    this._minDelay = options.reconnectMinMs ?? 500;
    this._maxDelay = options.reconnectMaxMs ?? 10_000;
    this._createSocket =
      options.createSocket ?? ((url: string) => new WebSocket(url));
  }

  public get connected(): boolean {
    return this._socket?.readyState === WebSocket.OPEN;
  }

  /** Opens the socket and keeps it open until `close()`. */
  public connect(): void {
    this._closed = false;
    this._open();
  }

  /** Closes for good; no reconnect follows. */
  public close(): void {
    this._closed = true;
    this._clearReconnect();
    this._socket?.close();
    this._socket = null;
  }

  /** Sends if connected; otherwise the message is dropped. */
  public send(msg: ClientMessage): void {
    if (!this.connected) return;
    this._socket?.send(JSON.stringify(msg));
  }

  public subscribe(listener: (event: TransportEvent) => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _open(): void {
    const socket = this._createSocket(this._url);
    this._socket = socket;

    socket.addEventListener('open', () => {
      this._attempt = 0;
      this._emit({ type: 'connected' });
    });
    socket.addEventListener('message', (event: MessageEvent) => {
      this._receive(event.data);
    });
    socket.addEventListener('close', () => {
      if (this._socket !== socket) return;
      this._socket = null;
      this._emit({ type: 'disconnected' });
      this._scheduleReconnect();
    });
    socket.addEventListener('error', () => {
      // The close event that follows handles reconnection.
    });
  }

  private _receive(data: unknown): void {
    if (typeof data !== 'string') {
      this.droppedFrames++;
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      this.droppedFrames++;
      return;
    }
    if (!Check(ServerMessageSchema, parsed)) {
      this.droppedFrames++;
      return;
    }

    this._emit({ type: 'message', msg: parsed });
  }

  private _scheduleReconnect(): void {
    if (this._closed) return;

    const delay = Math.min(this._minDelay * 2 ** this._attempt, this._maxDelay);
    this._attempt++;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._open();
    }, delay);
  }

  private _clearReconnect(): void {
    if (this._reconnectTimer !== null) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
  }

  private _emit(event: TransportEvent): void {
    for (const listener of this._listeners) listener(event);
  }
}
