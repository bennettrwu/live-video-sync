import {FastifyInstance} from 'fastify';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import SyncedState from './shared/syncedState';
import type SyncedClockInterface from './shared/syncedClockInterface';
const {performance} = require('perf_hooks');

type RoomEvents = {
  [key: string]: () => unknown;
};

class Clock implements SyncedClockInterface {
  now() {
    return performance.now();
  }
}

/**
 * roomSyncAPIv1()
 * A fastify plugin to handle roomSync v1 API
 * Handles websockets and REST api endpoints
 * @param fastify fastify server instance
 */
export default function roomSyncAPIv1(fastify: FastifyInstance) {
  const room_events = new EventEmitter() as TypedEmitter<RoomEvents>;
  const room_states: {
    [key: string]: SyncedState;
  } = {};
  const clock = new Clock();

  fastify.get('/roomSyncAPI/v1/:roomId/mediaList', (req, reply) => {
    reply.send([
      {
        name: 'Bocchi 1',
        video: '/bocchi1/master.m3u8',
        index: 0,
      },
      {
        name: 'Bocchi 2',
        video: '/bocchi2/master.m3u8',
        index: 1,
      },
    ]);
  });

  fastify.get('/roomSyncAPI/v1/clockSync', () => {
    const timestamp = clock.now();
    return {timestamp};
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
      let isBuffering = false;

      // Create room
      if (!(roomId in room_states)) {
        room_states[roomId] = new SyncedState(clock);
      }

      function sendUpdate() {
        ws.send(
          JSON.stringify({
            type: 'targetStateUpdate',
            ...room_states[roomId].getState(),
          })
        );
      }
      room_events.on(roomId, sendUpdate);
      sendUpdate();

      // Remove client from collection on close
      ws.on('close', () => {
        room_events.removeListener(roomId, sendUpdate);
        if (isBuffering) {
          room_states[roomId].subBuffering();
          room_events.emit(roomId);
        }
      });

      ws.on('message', (data, isBinary) => {
        if (isBinary) {
          // TODO: error handling
          return;
        }
        const message = JSON.parse(data.toString());

        if (message.type === 'heartbeat') {
          ws.send(JSON.stringify({type: 'heartbeat'}));
        } else if (message.type === 'play') {
          room_states[roomId].play();
          room_events.emit(roomId);
        } else if (message.type === 'pause') {
          room_states[roomId].pause();
          room_events.emit(roomId);
        } else if (message.type === 'seek') {
          room_states[roomId].seek(message.videoTime);
          room_events.emit(roomId);
        } else if (message.type === 'startBuffering') {
          if (!isBuffering) {
            isBuffering = true;
            room_states[roomId].addBuffering();
            room_events.emit(roomId);
          }
        } else if (message.type === 'stopBuffering') {
          if (isBuffering) {
            isBuffering = false;
            room_states[roomId].subBuffering();
            room_events.emit(roomId);
          }
        } else if (message.type === 'setMediaIndex') {
          room_states[roomId].setMediaIndex(message.mediaIndex);
          room_events.emit(roomId);
        }
      });
    }
  );
}
