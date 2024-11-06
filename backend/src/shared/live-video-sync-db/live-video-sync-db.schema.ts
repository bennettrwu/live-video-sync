import {integer, pgTable, timestamp, varchar, pgEnum, text} from 'drizzle-orm/pg-core';

export const accounts = pgTable('accounts', {
  user_id: integer().primaryKey().generatedAlwaysAsIdentity(),
  password_hash: varchar({length: 256}).notNull(),
  username: varchar({length: 256}).notNull().unique(),
});

export const sessions = pgTable('sessions', {
  token: varchar({length: 64}).primaryKey(),
  user_id: integer()
    .references(() => accounts.user_id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    })
    .notNull(),
  expires: timestamp({precision: 0}).notNull(),
});

export const rooms = pgTable('rooms', {
  room_id: integer().primaryKey().generatedAlwaysAsIdentity(),
  owner_id: integer()
    .references(() => accounts.user_id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    })
    .notNull(),
  room_name: varchar({length: 256}).notNull(),
});

export const roomUsers = pgTable('roomUsers', {
  room_id: integer()
    .references(() => rooms.room_id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    })
    .notNull(),
  user_id: integer()
    .references(() => accounts.user_id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    })
    .notNull(),
});

export const upload_status = pgEnum('upload_status', [
  'uploading',
  'uploadFailed',
  'parsing',
  'awaitParams',
  'processing',
  'processingFailed',
  'done',
]);

export const uploadStatus = pgTable('uploadStatus', {
  upload_id: integer().primaryKey().generatedAlwaysAsIdentity(),
  room_id: integer()
    .references(() => rooms.room_id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    })
    .notNull(),
  upload_status: upload_status().notNull(),
  parsed_info: text(),
});

export const media = pgTable('mediaTable', {
  room_id: integer()
    .references(() => rooms.room_id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    })
    .notNull(),
  index: integer().generatedAlwaysAsIdentity().notNull(),
  video_url: varchar({length: 2048}).notNull(),
  video_mime: varchar({length: 256}).notNull(),
  sub_url: varchar({length: 2048}),
  sub_lang: varchar({length: 256}),
  sub_label: varchar({length: 256}),
});
