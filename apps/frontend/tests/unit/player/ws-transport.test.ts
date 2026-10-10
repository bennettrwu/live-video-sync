import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type TransportEvent, WsTransport } from '#src/player/ws-transport.js';

class FakeSocket extends EventTarget {
  public static instances: FakeSocket[] = [];
  public readyState: number = WebSocket.CONNECTING;
  public sent: string[] = [];

  public constructor(public url: string) {
    super();
    FakeSocket.instances.push(this);
  }

  public send(data: string) {
    this.sent.push(data);
  }

  public close() {
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent(new Event('close'));
  }

  public open() {
    this.readyState = WebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  public receive(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
}

function transportWithFakeSocket() {
  const events: TransportEvent[] = [];
  const transport = new WsTransport({
    url: 'ws://test/api/rooms/abc/ws',
    reconnectMinMs: 100,
    reconnectMaxMs: 400,
    createSocket: (url) => new FakeSocket(url) as unknown as WebSocket,
  });
  transport.subscribe((event) => events.push(event));
  return { transport, events };
}

describe('WsTransport', () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports connected once the socket opens', () => {
    // Arrange
    const { transport, events } = transportWithFakeSocket();
    transport.connect();

    // Act
    FakeSocket.instances[0]!.open();

    // Assert
    expect(events).toEqual([{ type: 'connected' }]);
    expect(transport.connected).toBe(true);
  });

  it('delivers valid server messages and drops invalid frames', () => {
    // Arrange
    const { transport, events } = transportWithFakeSocket();
    transport.connect();
    const socket = FakeSocket.instances[0]!;
    socket.open();

    // Act
    socket.receive(JSON.stringify({ t: 'pong', c: 1, s: 2 }));
    socket.receive(JSON.stringify({ t: 'nope' }));
    socket.receive('not json');
    socket.receive(new ArrayBuffer(2));

    // Assert
    expect(events).toEqual([
      { type: 'connected' },
      { type: 'message', msg: { t: 'pong', c: 1, s: 2 } },
    ]);
    expect(transport.droppedFrames).toBe(3);
  });

  it('reconnects with growing delay after a close', () => {
    // Arrange
    const { transport, events } = transportWithFakeSocket();
    transport.connect();
    FakeSocket.instances[0]!.open();

    // Act
    FakeSocket.instances[0]!.close();
    vi.advanceTimersByTime(100);
    FakeSocket.instances[1]!.close();
    vi.advanceTimersByTime(199);
    const beforeSecondRetry = FakeSocket.instances.length;
    vi.advanceTimersByTime(1);

    // Assert
    expect(events.filter((e) => e.type === 'disconnected')).toHaveLength(2);
    expect(beforeSecondRetry).toBe(2);
    expect(FakeSocket.instances).toHaveLength(3);
  });

  it('does not reconnect after close()', () => {
    // Arrange
    const { transport } = transportWithFakeSocket();
    transport.connect();
    FakeSocket.instances[0]!.open();

    // Act
    transport.close();
    vi.advanceTimersByTime(10_000);

    // Assert
    expect(FakeSocket.instances).toHaveLength(1);
  });

  it('drops sends while disconnected', () => {
    // Arrange
    const { transport } = transportWithFakeSocket();
    transport.connect();

    // Act
    transport.send({ t: 'ping', c: 1 });

    // Assert
    expect(FakeSocket.instances[0]!.sent).toEqual([]);
  });
});
