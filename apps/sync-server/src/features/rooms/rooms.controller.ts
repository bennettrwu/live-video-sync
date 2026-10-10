import type { FastifyReply, FastifyRequest } from 'fastify';

import { HttpError } from '@live-video-sync/fastify-platform';

import type { RoomDefinitionRepository } from './room-definition.repository.js';
import type { RoomSocket } from './room-socket.js';
import type { RoomSyncService } from './room-sync.service.js';

type JoinState = 'none' | 'pending' | 'joined';

export class RoomsController {
  private readonly _roomSync: RoomSyncService;
  private readonly _definitions: RoomDefinitionRepository;

  public constructor(
    roomSyncService: RoomSyncService,
    roomDefinitionRepository: RoomDefinitionRepository,
  ) {
    this._roomSync = roomSyncService;
    this._definitions = roomDefinitionRepository;
  }

  /**
   * Looks a room up for the join page.
   * @throws 404 when the code is unknown
   */
  public async getRoom(
    request: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply,
  ): Promise<{ code: string; name: string }> {
    const definition = await this._definitions.findByCode(request.params.code);
    if (definition === null) {
      throw new HttpError(404, 'unknown-room', 'no such room');
    }

    void reply.code(200);
    return { code: definition.code, name: definition.name };
  }

  /**
   * Drives one member's socket. The first frame must be `hello`; everything
   * before a successful join except `ping` is rejected.
   */
  public handleSocket(socket: RoomSocket, code: string): void {
    let joinState: JoinState = 'none';

    socket.onMessage((message) => {
      switch (message.t) {
        case 'hello':
          if (joinState !== 'none') return;
          joinState = 'pending';
          void this._roomSync.join(code, socket, message.name).then((ok) => {
            joinState = ok ? 'joined' : 'none';
            if (!ok) socket.close(4404, 'unknown room');
          });
          return;
        case 'ping':
          this._roomSync.handlePing(socket, message.c);
          return;
        case 'intent':
          if (joinState !== 'joined') {
            socket.send({
              t: 'error',
              code: 'not-joined',
              message: 'send hello first',
            });
            return;
          }
          this._roomSync.handleIntent(
            code,
            socket.id,
            message.id,
            message.intent,
          );
          return;
      }
    });

    socket.onClose(() => {
      if (joinState === 'joined') this._roomSync.leave(code, socket.id);
    });
  }
}
