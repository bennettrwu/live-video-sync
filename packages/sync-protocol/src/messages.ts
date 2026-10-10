import { type Static, Type } from 'typebox';

import { LogEntrySchema } from './log.js';
import { MediaItemSchema } from './media.js';
import { MemberSchema } from './member.js';
import { PlaybackStateSchema } from './playback-state.js';

/**
 * A request to change shared playback, or a stall report. Intents carry no
 * timestamps; the server stamps them with its own clock.
 */
export const SharedIntentSchema = Type.Union([
  Type.Object({ action: Type.Literal('play') }),
  Type.Object({ action: Type.Literal('pause') }),
  Type.Object({ action: Type.Literal('seek'), time: Type.Number() }),
  Type.Object({ action: Type.Literal('media'), mediaId: Type.String() }),
  Type.Object({ action: Type.Literal('stall'), on: Type.Boolean() }),
]);
export type SharedIntent = Static<typeof SharedIntentSchema>;

export const ClientMessageSchema = Type.Union([
  Type.Object({
    t: Type.Literal('hello'),
    name: Type.String({ minLength: 1, maxLength: 40 }),
    lastSeq: Type.Optional(Type.Integer({ minimum: 0 })),
  }),
  Type.Object({
    t: Type.Literal('intent'),
    id: Type.Integer({ minimum: 0 }),
    intent: SharedIntentSchema,
  }),
  Type.Object({ t: Type.Literal('ping'), c: Type.Number() }),
]);
export type ClientMessage = Static<typeof ClientMessageSchema>;

export const ServerErrorCodeSchema = Type.Union([
  Type.Literal('bad-message'),
  Type.Literal('unknown-room'),
  Type.Literal('unknown-media'),
  Type.Literal('not-joined'),
]);
export type ServerErrorCode = Static<typeof ServerErrorCodeSchema>;

export const ServerMessageSchema = Type.Union([
  Type.Object({
    t: Type.Literal('welcome'),
    you: Type.Object({ connectionId: Type.String() }),
    room: Type.Object({ code: Type.String(), name: Type.String() }),
    media: Type.Array(MediaItemSchema),
    members: Type.Array(MemberSchema),
    playback: PlaybackStateSchema,
    log: Type.Array(LogEntrySchema),
  }),
  Type.Object({
    t: Type.Literal('playback'),
    playback: PlaybackStateSchema,
    cause: Type.Optional(
      Type.Object({
        connectionId: Type.String(),
        intentId: Type.Optional(Type.Integer({ minimum: 0 })),
      }),
    ),
  }),
  Type.Object({
    t: Type.Literal('members'),
    members: Type.Array(MemberSchema),
  }),
  Type.Object({ t: Type.Literal('log'), entry: LogEntrySchema }),
  Type.Object({ t: Type.Literal('pong'), c: Type.Number(), s: Type.Number() }),
  Type.Object({
    t: Type.Literal('error'),
    code: ServerErrorCodeSchema,
    message: Type.String(),
  }),
]);
export type ServerMessage = Static<typeof ServerMessageSchema>;
