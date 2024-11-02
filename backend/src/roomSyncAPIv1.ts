import {FastifyInstance} from 'fastify';
import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

import {parseJSONMessage} from '@common/utils/parseJSONMessage';
import {parseClientSyncMessage} from '@common/utils/parseSyncMessage';

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
  fastify.get('/roomSyncAPI/v1/:roomId/mediaList', (req, reply) => {
    reply.send([
      {
        name: 'Frieren',
        video: {src: '/frieren/video.m3u8', type: 'application/x-mpegURL'},
        subtitles: {
          src: '/frieren/subtitles.vtt',
          langugage: 'en',
          label: 'English',
        },
        index: 0,
      },
      {
        name: 'Monogatari',
        video: {src: '/monogatari/video.m3u8', type: 'application/x-mpegURL'},
        subtitles: {
          src: '/monogatari/subtitles.vtt',
          langugage: 'en',
          label: 'English',
        },
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

      room_events.emit(
        roomId,
        JSON.stringify({
          type: 'join',
          uuid,
        })
      );

      // When room has an update, send it to client
      const sendSyncState = (syncState: string) => {
        ws.send(syncState);
      };
      room_events.on(roomId, sendSyncState);

      ws.on('error', err => {
        req.log.error({err});
      });

      ws.once('close', code => {
        room_events.emit(roomId, JSON.stringify({type: 'leave', uuid}));
        room_events.removeListener(roomId, sendSyncState);
        req.log.info({msg: 'Websocket closed', code});
      });

      // When client has an update, emit room update event
      ws.on('message', (data, isBinary) => {
        try {
          const syncTime = Date.now() / 1_000;

          const jsonObject = parseJSONMessage(data, isBinary);
          req.log.debug({msg: 'Parsed JSON', jsonObject});

          const message = parseClientSyncMessage(jsonObject);

          Object.assign(message, {uuid});
          if (message.type === 'state') Object.assign(message, {syncTime});

          room_events.emit(roomId, JSON.stringify(message));
        } catch (err) {
          req.log.warn({err});

          // TODO Error handle
          ws.close();
        }
      });
    }
  );
}
