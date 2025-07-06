import {FastifyInstance} from 'fastify';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

type RoomEvents = {
  [key: string]: (syncState: string) => unknown;
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
        name: 'Frieren 28',
        video: {src: '/frieren28/video.m3u8', type: 'application/x-mpegURL'},
        subtitles: {
          src: '/frieren28/subtitles.vtt',
          langugage: 'en',
          label: 'English',
        },
        thumbnailUrl: '/frieren28/thumbnail.png',
        index: 0,
      },
      {
        name: 'Frieren Maru Maru',
        video: {src: '/frieren/video.m3u8', type: 'application/x-mpegURL'},
        subtitles: {
          src: '/frieren/subtitles.vtt',
          langugage: 'en',
          label: 'English',
        },
        thumbnailUrl: '/frieren/thumbnail.png',
        index: 1,
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
      if (!room_states[roomId]) {
        room_states[roomId] = {
          paused: true,
          mediaIndex: 0,
          currentTime: 0,
          updateTime: Date.now(),
        };
      }

      function sendSyncState(state: string) {
        ws.send(state);
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
      room_events.emit(roomId, JSON.stringify({type: 'join', uuid}));

      ws.on('close', code => {
        req.log.info({msg: 'Websocket closed', code});
        room_events.removeListener(roomId, sendSyncState);
        room_events.emit(roomId, JSON.stringify({type: 'leave', uuid}));
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

        if (message.type === 'heartbeat') {
          ws.send(JSON.stringify({type: 'heartbeat', uuid}));
        } else if (message.type === 'startBuffering') {
          room_events.emit(
            roomId,
            JSON.stringify({type: 'startBuffering', uuid})
          );
        } else if (message.type === 'endBuffering') {
          room_events.emit(
            roomId,
            JSON.stringify({type: 'endBuffering', uuid})
          );
        } else if (message.type === 'targetStateUpdate') {
          room_states[roomId].paused = message.paused;
          room_states[roomId].mediaIndex = message.mediaIndex;
          room_states[roomId].currentTime = message.currentTime;
          room_states[roomId].updateTime = Date.now();

          room_events.emit(
            roomId,
            JSON.stringify({
              type: 'targetStateUpdate',
              paused: message.paused,
              mediaIndex: message.mediaIndex,
              currentTime: message.currentTime,
            })
          );
        }
      });
    }
  );
}
