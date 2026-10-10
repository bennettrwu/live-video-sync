import { describe, expect, it, vi } from 'vitest';

import type { RoomDefinitionRepository } from '#src/features/rooms/room-definition.repository.js';
import type { RoomSyncService } from '#src/features/rooms/room-sync.service.js';
import { RoomsController } from '#src/features/rooms/rooms.controller.js';
import { FakeRoomSocket } from '#tests/utils/fakes.js';

function setup(joinResult = true) {
  const service = {
    join: vi.fn(() => Promise.resolve(joinResult)),
    leave: vi.fn(),
    handleIntent: vi.fn(),
    handlePing: vi.fn(),
  };
  const controller = new RoomsController(
    service as unknown as RoomSyncService,
    {} as RoomDefinitionRepository,
  );
  const socket = new FakeRoomSocket('s1');
  controller.handleSocket(socket, 'demo');
  return { service, socket };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('RoomsController.handleSocket', () => {
  it('rejects intents before hello', () => {
    // Arrange
    const { service, socket } = setup();

    // Act
    socket.receive({ t: 'intent', id: 1, intent: { action: 'play' } });

    // Assert
    expect(service.handleIntent).not.toHaveBeenCalled();
    expect(socket.sent).toEqual([
      { t: 'error', code: 'not-joined', message: expect.any(String) },
    ]);
  });

  it('joins on hello, then forwards intents and leaves on close', async () => {
    // Arrange
    const { service, socket } = setup();

    // Act
    socket.receive({ t: 'hello', name: 'Alice' });
    await flush();
    socket.receive({ t: 'intent', id: 7, intent: { action: 'pause' } });
    socket.disconnect();

    // Assert
    expect(service.join).toHaveBeenCalledWith('demo', socket, 'Alice');
    expect(service.handleIntent).toHaveBeenCalledWith('demo', 's1', 7, {
      action: 'pause',
    });
    expect(service.leave).toHaveBeenCalledWith('demo', 's1');
  });

  it('closes the socket when the room is unknown and never leaves', async () => {
    // Arrange
    const { service, socket } = setup(false);

    // Act
    socket.receive({ t: 'hello', name: 'Alice' });
    await flush();
    socket.disconnect();

    // Assert
    expect(socket.closedWith).toEqual([4404, 'unknown room']);
    expect(service.leave).not.toHaveBeenCalled();
  });

  it('answers pings even before joining and ignores a second hello', async () => {
    // Arrange
    const { service, socket } = setup();

    // Act
    socket.receive({ t: 'ping', c: 5 });
    socket.receive({ t: 'hello', name: 'Alice' });
    socket.receive({ t: 'hello', name: 'Alice again' });
    await flush();

    // Assert
    expect(service.handlePing).toHaveBeenCalledWith(socket, 5);
    expect(service.join).toHaveBeenCalledTimes(1);
  });
});
