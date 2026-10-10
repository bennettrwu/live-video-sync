import type { TSchema } from 'typebox';
import { Check, Errors } from 'typebox/value';
import { v4 as uuidv4 } from 'uuid';

/** The slice of a `ws` socket the wrapper needs; fakes implement it in tests. */
export interface RawSocket {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: 'message', listener: (data: unknown) => void): unknown;
  on(
    event: 'close',
    listener: (code: number, reason: unknown) => void,
  ): unknown;
}

const OPEN = 1;

/**
 * A socket that only ever hands validated `TClient` messages to its listener
 * and only accepts `TServer` messages to send. Invalid inbound frames are
 * dropped and counted; the connection stays open.
 */
export class TypedSocket<TClient, TServer> {
  public readonly id: string;
  public invalidFrames = 0;

  private readonly _socket: RawSocket;
  private readonly _clientMessage: TSchema;
  private _onInvalid: ((message: string) => void) | undefined;

  public constructor(
    socket: RawSocket,
    clientMessage: TSchema,
    id: string = uuidv4(),
  ) {
    this._socket = socket;
    this._clientMessage = clientMessage;
    this.id = id;
  }

  public get isOpen(): boolean {
    return this._socket.readyState === OPEN;
  }

  public send(message: TServer): void {
    if (!this.isOpen) return;
    this._socket.send(JSON.stringify(message));
  }

  /**
   * Listens for inbound frames that parse and validate as `TClient`.
   */
  public onMessage(listener: (message: TClient) => void): void {
    this._socket.on('message', (data: unknown) => {
      const parsed = this._parse(data);
      if (parsed === undefined) return;
      listener(parsed);
    });
  }

  /**
   * Called with a description whenever an inbound frame is dropped.
   */
  public onInvalid(listener: (message: string) => void): void {
    this._onInvalid = listener;
  }

  public onClose(listener: (code: number, reason: string) => void): void {
    this._socket.on('close', (code: number, reason: unknown) => {
      listener(code, String(reason));
    });
  }

  public close(code?: number, reason?: string): void {
    this._socket.close(code, reason);
  }

  private _parse(data: unknown): TClient | undefined {
    let value: unknown;
    try {
      value = JSON.parse(String(data));
    } catch {
      this._reject('frame is not valid JSON');
      return undefined;
    }

    if (!Check(this._clientMessage, value)) {
      const reasons = [...Errors(this._clientMessage, value)]
        .map((error) => error.message)
        .join('; ');
      this._reject(reasons);
      return undefined;
    }
    return value as TClient;
  }

  private _reject(message: string): void {
    this.invalidFrames++;
    this._onInvalid?.(message);
  }
}
