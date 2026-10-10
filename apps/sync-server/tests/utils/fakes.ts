import type {
  ClientMessage,
  RoomDefinition,
  ServerMessage,
} from '@live-video-sync/sync-protocol';

import type { RoomSocket } from '#src/features/rooms/room-socket.js';

/** A socket that records what it was sent and lets tests push frames in. */
export class FakeRoomSocket implements RoomSocket {
  public readonly sent: ServerMessage[] = [];
  public closedWith: [number | undefined, string | undefined] | null = null;
  private _onMessage: ((message: ClientMessage) => void) | undefined;
  private _onClose: ((code: number, reason: string) => void) | undefined;

  public constructor(public readonly id: string) {}

  public send(message: ServerMessage): void {
    this.sent.push(message);
  }

  public close(code?: number, reason?: string): void {
    this.closedWith = [code, reason];
  }

  public onMessage(listener: (message: ClientMessage) => void): void {
    this._onMessage = listener;
  }

  public onClose(listener: (code: number, reason: string) => void): void {
    this._onClose = listener;
  }

  public receive(message: ClientMessage): void {
    this._onMessage?.(message);
  }

  public disconnect(): void {
    this._onClose?.(1001, 'going away');
  }

  public sentOfType<T extends ServerMessage['t']>(
    type: T,
  ): Extract<ServerMessage, { t: T }>[] {
    return this.sent.filter(
      (message): message is Extract<ServerMessage, { t: T }> =>
        message.t === type,
    );
  }
}

export const demoDefinition: RoomDefinition = {
  code: 'demo',
  name: 'Demo room',
  media: [
    { id: 'ep1', name: 'Episode 1', url: '/media/demo/ep1/master.m3u8' },
    { id: 'ep2', name: 'Episode 2', url: '/media/demo/ep2/master.m3u8' },
  ],
};

/** A definition repository backed by a map. */
export class FakeRoomDefinitionRepository {
  private readonly _definitions = new Map<string, RoomDefinition>();

  public constructor(definitions: RoomDefinition[] = [demoDefinition]) {
    for (const definition of definitions) {
      this._definitions.set(definition.code, definition);
    }
  }

  public findByCode(code: string): Promise<RoomDefinition | null> {
    return Promise.resolve(this._definitions.get(code) ?? null);
  }
}

/** A clock tests advance by hand. */
export class FakeClock {
  private _now: number;

  public constructor(start = 1_000_000) {
    this._now = start;
  }

  public now = (): number => this._now;

  public advance(ms: number): void {
    this._now += ms;
  }
}
