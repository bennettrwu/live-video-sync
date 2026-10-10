import { EventEmitter } from 'node:events';
import { Type } from 'typebox';
import { describe, expect, it, vi } from 'vitest';

import { type RawSocket, TypedSocket } from '#src/websocket/typed-socket.js';

class FakeRawSocket extends EventEmitter implements RawSocket {
  public readyState = 1;
  public sent: string[] = [];
  public closedWith: [number | undefined, string | undefined] | null = null;

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(code?: number, reason?: string): void {
    this.closedWith = [code, reason];
    this.readyState = 3;
  }
}

const PingSchema = Type.Object({ t: Type.Literal('ping'), c: Type.Number() });
interface Ping {
  t: 'ping';
  c: number;
}
interface Pong {
  t: 'pong';
  c: number;
}

describe('TypedSocket', () => {
  it('delivers frames that validate', () => {
    // Arrange
    const raw = new FakeRawSocket();
    const socket = new TypedSocket<Ping, Pong>(raw, PingSchema);
    const received: Ping[] = [];
    socket.onMessage((msg) => received.push(msg));

    // Act
    raw.emit('message', Buffer.from(JSON.stringify({ t: 'ping', c: 5 })));

    // Assert
    expect(received).toEqual([{ t: 'ping', c: 5 }]);
    expect(socket.invalidFrames).toBe(0);
  });

  it('drops and counts frames that are not JSON or do not validate', () => {
    // Arrange
    const raw = new FakeRawSocket();
    const socket = new TypedSocket<Ping, Pong>(raw, PingSchema);
    const received: Ping[] = [];
    const invalid = vi.fn();
    socket.onMessage((msg) => received.push(msg));
    socket.onInvalid(invalid);

    // Act
    raw.emit('message', Buffer.from('not json'));
    raw.emit('message', Buffer.from(JSON.stringify({ t: 'ping' })));

    // Assert
    expect(received).toEqual([]);
    expect(socket.invalidFrames).toBe(2);
    expect(invalid).toHaveBeenCalledTimes(2);
    expect(invalid.mock.calls[1]?.[0]).toContain('c');
    expect(raw.readyState).toBe(1);
  });

  it('serializes outbound messages and ignores sends after close', () => {
    // Arrange
    const raw = new FakeRawSocket();
    const socket = new TypedSocket<Ping, Pong>(raw, PingSchema, 'sock-1');

    // Act
    socket.send({ t: 'pong', c: 1 });
    socket.close(1000, 'done');
    socket.send({ t: 'pong', c: 2 });

    // Assert
    expect(socket.id).toBe('sock-1');
    expect(raw.sent).toEqual(['{"t":"pong","c":1}']);
    expect(raw.closedWith).toEqual([1000, 'done']);
  });

  it('reports close code and reason', () => {
    // Arrange
    const raw = new FakeRawSocket();
    const socket = new TypedSocket<Ping, Pong>(raw, PingSchema);
    const onClose = vi.fn();
    socket.onClose(onClose);

    // Act
    raw.emit('close', 1001, Buffer.from('going away'));

    // Assert
    expect(onClose).toHaveBeenCalledWith(1001, 'going away');
  });
});
