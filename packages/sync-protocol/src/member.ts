import { type Static, Type } from 'typebox';

export const MemberSchema = Type.Object({
  connectionId: Type.String(),
  name: Type.String(),
  stalledSince: Type.Union([Type.Number(), Type.Null()]),
});
export type Member = Static<typeof MemberSchema>;
