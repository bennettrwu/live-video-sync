import {FastifyInstance} from 'fastify';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

type RoomEvents = {
  [key: string]: (
    syncState: {[key: string]: string} & {uuid: string}
  ) => unknown;
};

/**
 * roomSyncAPIv1()
 * A fastify plugin to handle roomSync v1 API
 * Handles websockets and REST api endpoints
 * @param fastify fastify server instance
 */
export default function roomSyncAPIv1(fastify: FastifyInstance) {
  const room_events = new EventEmitter() as TypedEmitter<RoomEvents>;
  const room_states: {
    [key: string]: {
      paused: boolean;
      mediaIndex: number;
      currentTime: number;
      updateTime: number;
    };
  } = {};

  fastify.get('/roomSyncAPI/v1/:roomId/mediaList', (req, reply) => {
    reply.send([
      {
        name: 'Test',
        video: '/test/master.m3u8',
        index: 0,
      },
    ]);
  });

  fastify.get(
    '/roomSyncAPI/v1/:roomId',
    {
      schema: {
        // TODO: Documentation
        description: '',
        summary: '',
        params: {
          type: 'object',
          properties: {
            roomId: {type: 'string', minLength: 1},
          },
          required: ['roomId'],
        },
      },
      websocket: true,
    },
    (ws, req) => {
      const roomId = (req.params as {roomId: string}).roomId;
      const uuid = req.id;
      if (!(roomId in room_states)) {
        room_states[roomId] = {
          paused: true,
          mediaIndex: 0,
          currentTime: 0,
          updateTime: Date.now(),
        };
      }

      function sendSyncState(state: {uuid: string}) {
        if (state.uuid === uuid) return;
        ws.send(JSON.stringify(state));
      }
      room_events.on(roomId, sendSyncState);

      const targetState = room_states[roomId];
      const targetTime = targetState.paused
        ? targetState.currentTime
        : (Date.now() - targetState.updateTime) / 1000 +
          targetState.currentTime;
      ws.send(
        JSON.stringify({
          type: 'targetStateUpdate',
          paused: targetState.paused,
          mediaIndex: targetState.mediaIndex,
          currentTime: targetTime,
        })
      );

      ws.on('close', code => {
        req.log.info({msg: 'Websocket closed', code});
        room_events.removeListener(roomId, sendSyncState);
        room_events.emit(roomId, {type: 'leave', uuid});
      });

      ws.on('error', err => {
        req.log.error({err});
      });

      ws.on('message', (data, isBinary) => {
        if (isBinary) {
          // TODO: Error handling
          return;
        }

        const message = JSON.parse(data.toString());
        console.log(message);

        if (message.type === 'heartbeat') {
          ws.send(JSON.stringify({type: 'heartbeat', uuid}));
        } else if (message.type === 'startBuffering') {
          room_events.emit(roomId, {type: 'startBuffering', uuid});
        } else if (message.type === 'stopBuffering') {
          room_events.emit(roomId, {type: 'stopBuffering', uuid});
        } else if (message.type === 'targetStateUpdate') {
          room_states[roomId].paused = message.paused;
          room_states[roomId].mediaIndex = message.mediaIndex;
          room_states[roomId].currentTime = message.currentTime;
          room_states[roomId].updateTime = Date.now();

          room_events.emit(roomId, {
            type: 'targetStateUpdate',
            paused: message.paused,
            mediaIndex: message.mediaIndex,
            currentTime: message.currentTime,
            uuid,
          });
        }
      });
    }
  );
}
