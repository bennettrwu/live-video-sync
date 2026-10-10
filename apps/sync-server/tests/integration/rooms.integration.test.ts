import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

import type { BaseFastifyInstance } from '@live-video-sync/fastify-platform';
import type {
  ClientMessage,
  ServerMessage,
} from '@live-video-sync/sync-protocol';

import { buildServer } from '#src/build-server.js';
import { demoDefinition } from '#tests/utils/fakes.js';

/** A websocket client that queues server messages for `next()`. */
class TestClient {
  private readonly _socket: WebSocket;
  private readonly _queue: ServerMessage[] = [];
  private readonly _waiters: ((message: ServerMessage) => void)[] = [];

  private constructor(socket: WebSocket) {
    this._socket = socket;
    socket.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString('utf8')) as ServerMessage;
      const waiter = this._waiters.shift();
      if (waiter === undefined) this._queue.push(message);
      else waiter(message);
    });
  }

  public static connect(url: string): Promise<TestClient> {
    const socket = new WebSocket(url);
    return new Promise((resolve, reject) => {
      socket.once('open', () => {
        resolve(new TestClient(socket));
      });
      socket.once('error', reject);
    });
  }

  public send(message: ClientMessage): void {
    this._socket.send(JSON.stringify(message));
  }

  public next(): Promise<ServerMessage> {
    const queued = this._queue.shift();
    if (queued !== undefined) return Promise.resolve(queued);
    return new Promise((resolve) => this._waiters.push(resolve));
  }

  /** Reads messages until one of the given type arrives. */
  public async nextOfType<T extends ServerMessage['t']>(
    type: T,
  ): Promise<Extract<ServerMessage, { t: T }>> {
    for (;;) {
      const message = await this.next();
      if (message.t === type) {
        return message as Extract<ServerMessage, { t: T }>;
      }
    }
  }

  public close(): void {
    this._socket.close();
  }
}

describe('rooms over websocket', () => {
  let app: BaseFastifyInstance;
  let roomsDir: string;
  let baseUrl: string;

  beforeAll(async () => {
    roomsDir = await mkdtemp(join(tmpdir(), 'rooms-'));
    await writeFile(
      join(roomsDir, 'demo.json'),
      JSON.stringify(demoDefinition),
    );
    app = await buildServer({
      port: 0,
      host: '127.0.0.1',
      roomsDir,
      mediaDir: './does-not-exist',
      logLevel: 'silent',
    });
    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    baseUrl = address.replace('http://', 'ws://');
  });
  afterAll(async () => {
    await app.close();
    await rm(roomsDir, { recursive: true, force: true });
  });

  it('welcomes a joiner and announces them to the room', async () => {
    // Arrange
    const alice = await TestClient.connect(`${baseUrl}/api/rooms/demo/ws`);
    alice.send({ t: 'hello', name: 'Alice' });
    const aliceWelcome = await alice.nextOfType('welcome');

    // Act
    const bob = await TestClient.connect(`${baseUrl}/api/rooms/demo/ws`);
    bob.send({ t: 'hello', name: 'Bob' });
    const bobWelcome = await bob.nextOfType('welcome');
    const members = await alice.nextOfType('members');

    // Assert
    expect(aliceWelcome.members.map((m) => m.name)).toEqual(['Alice']);
    expect(bobWelcome.members.map((m) => m.name)).toEqual(['Alice', 'Bob']);
    expect(bobWelcome.media).toEqual(demoDefinition.media);
    expect(members.members.map((m) => m.name)).toEqual(['Alice', 'Bob']);
    alice.close();
    bob.close();
  });

  it('broadcasts play to both clients and logs a leave on disconnect', async () => {
    // Arrange
    const alice = await TestClient.connect(`${baseUrl}/api/rooms/demo/ws`);
    const bob = await TestClient.connect(`${baseUrl}/api/rooms/demo/ws`);
    alice.send({ t: 'hello', name: 'Alice' });
    bob.send({ t: 'hello', name: 'Bob' });
    const aliceWelcome = await alice.nextOfType('welcome');
    await bob.nextOfType('welcome');

    // Act
    alice.send({
      t: 'intent',
      id: 1,
      intent: { action: 'media', mediaId: 'ep1' },
    });
    await alice.nextOfType('playback');
    await bob.nextOfType('playback');
    alice.send({ t: 'intent', id: 2, intent: { action: 'play' } });
    const alicePlayback = await alice.nextOfType('playback');
    const bobPlayback = await bob.nextOfType('playback');
    bob.send({ t: 'intent', id: 1, intent: { action: 'stall', on: true } });
    const stalledMembers = await alice.nextOfType('members');
    bob.close();
    const leaveLog = await (async () => {
      for (;;) {
        const log = await alice.nextOfType('log');
        if (log.entry.event.kind === 'leave') return log;
      }
    })();

    // Assert
    expect(alicePlayback).toMatchObject({
      playback: { paused: false, mediaId: 'ep1' },
      cause: { connectionId: aliceWelcome.you.connectionId, intentId: 2 },
    });
    expect(bobPlayback.playback).toEqual(alicePlayback.playback);
    expect(
      stalledMembers.members.find((m) => m.name === 'Bob')?.stalledSince,
    ).toEqual(expect.any(Number));
    expect(leaveLog.entry).toMatchObject({
      name: 'Bob',
      event: { kind: 'leave' },
    });
    alice.close();
  });

  it('rejects an unknown room with an error and closes', async () => {
    // Arrange
    const client = await TestClient.connect(`${baseUrl}/api/rooms/nope/ws`);

    // Act
    client.send({ t: 'hello', name: 'Nobody' });
    const error = await client.nextOfType('error');

    // Assert
    expect(error.code).toBe('unknown-room');
    client.close();
  });

  it('answers pings with the server clock', async () => {
    // Arrange
    const client = await TestClient.connect(`${baseUrl}/api/rooms/demo/ws`);
    const before = Date.now();

    // Act
    client.send({ t: 'ping', c: 123 });
    const pong = await client.nextOfType('pong');

    // Assert
    expect(pong.c).toBe(123);
    expect(pong.s).toBeGreaterThanOrEqual(before);
    client.close();
  });
});
