import { type Static, Type } from 'typebox';

export const LogEventSchema = Type.Union([
  Type.Object({ kind: Type.Literal('join') }),
  Type.Object({ kind: Type.Literal('leave') }),
  Type.Object({ kind: Type.Literal('play'), at: Type.Number() }),
  Type.Object({ kind: Type.Literal('pause'), at: Type.Number() }),
  Type.Object({
    kind: Type.Literal('seek'),
    from: Type.Number(),
    to: Type.Number(),
  }),
  Type.Object({ kind: Type.Literal('media'), mediaId: Type.String() }),
  Type.Object({ kind: Type.Literal('stall') }),
  Type.Object({ kind: Type.Literal('recovered'), afterMs: Type.Number() }),
]);
export type LogEvent = Static<typeof LogEventSchema>;

export const LogEntrySchema = Type.Object({
  id: Type.Integer({ minimum: 0 }),
  at: Type.Number(),
  connectionId: Type.String(),
  name: Type.String(),
  event: LogEventSchema,
});
export type LogEntry = Static<typeof LogEntrySchema>;
