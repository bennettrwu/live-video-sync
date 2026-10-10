import { type Static, Type } from 'typebox';

export const MediaItemSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  url: Type.String({ minLength: 1 }),
});
export type MediaItem = Static<typeof MediaItemSchema>;

export const RoomDefinitionSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  media: Type.Array(MediaItemSchema),
});
export type RoomDefinition = Static<typeof RoomDefinitionSchema>;
