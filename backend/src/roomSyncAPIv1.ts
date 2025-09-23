import fs from 'fs';
import {FastifyInstance} from 'fastify';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import SyncedState from './shared/syncedState';
import type SyncedClockInterface from './shared/syncedClockInterface';

const mediaList = JSON.parse(fs.readFileSync('./mediaList.json', 'utf8'));

type RoomEvents = {
  [key: string]: () => unknown;
};

class Clock implements SyncedClockInterface {
  now() {
    return Date.now();
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
  const room_clients: {
    [key: string]: number;
  } = {};
  const clock = new Clock();

  fastify.get('/roomSyncAPI/v1/:roomId/mediaList', (req, reply) => {
    reply.send(mediaList);
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
        req.log.info({msg: "Room Id doesn't exist, creating new room"});
        room_states[roomId] = new SyncedState(clock);
        room_clients[roomId] = 0;
      }

      req.log.info({msg: 'Sync websocket opened'});
      room_clients[roomId]++;

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
      ws.on('close', code => {
        req.log.info({msg: 'Sync websocket closed', code});
        room_clients[roomId]--;
        if (room_clients[roomId] === 0) {
          room_states[roomId].pause();
        }

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

        req.log.info({msg: 'Received sync message', message});

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
