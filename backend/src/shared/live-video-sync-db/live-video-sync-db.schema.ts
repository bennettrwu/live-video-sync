import {gt, sql} from 'drizzle-orm';
import {integer, pgTable, timestamp, varchar, pgEnum, text, uniqueIndex, pgView, index} from 'drizzle-orm/pg-core';

// Schema definitions for liveVideoSyncDB

export const ACCOUNTS_TABLE = pgTable(
  'accounts',
  {
    userId: integer().primaryKey().generatedAlwaysAsIdentity(),
    passwordHash: varchar({length: 256}).notNull(),
    username: varchar({length: 256}).notNull().unique(),
  },
  table => [
    {
      accountsUsernameIndex: uniqueIndex('accountsUsernameIndex').on(table.username),
    },
  ],
);

export const SESSIONS_TABLE = pgTable(
  'sessions',
  {
    token: varchar({length: 64}).primaryKey(),
    userId: integer()
      .references(() => ACCOUNTS_TABLE.userId, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      })
      .notNull(),
    expires: timestamp({precision: 0}).notNull(),
  },
  table => [
    {
      sessionUserIdIndex: uniqueIndex('sessionUserIdIndex').on(table.userId),
      sessionExpiresIndex: uniqueIndex('sessionExpiresIndex').on(table.expires),
    },
  ],
);

export const SESSIONS_VIEW = pgView('sessionsView').as(qb =>
  qb
    .select()
    .from(SESSIONS_TABLE)
    .where(gt(SESSIONS_TABLE.expires, sql`(current_timestamp)`)),
);

export const ROOMS_TABLE = pgTable(
  'rooms',
  {
    roomId: integer().primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer()
      .references(() => ACCOUNTS_TABLE.userId, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      })
      .notNull(),
    roomName: varchar({length: 256}).notNull(),
  },
  table => [
    {
      roomsOwnerIdIndex: uniqueIndex('roomsOwnerIdIndex').on(table.ownerId),
    },
  ],
);

export const ROOM_USERS = pgTable(
  'roomUsers',
  {
    roomId: integer()
      .references(() => ROOMS_TABLE.roomId, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      })
      .notNull(),
    userId: integer()
      .references(() => ACCOUNTS_TABLE.userId, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      })
      .notNull(),
  },
  table => [
    {
      roomsUsersRoomIdIndex: index('roomsUsersRoomIdIndex').on(table.roomId),
      roomsUsersUserIdIndex: index('roomsUsersUserIdIndex').on(table.userId),
    },
  ],
);

export const UPLOAD_STATUS = pgEnum('upload_status', [
  'uploading',
  'uploadFailed',
  'parsing',
  'awaitParams',
  'processing',
  'processingFailed',
  'done',
]);

export const UPLOAD_STATUS_TABLE = pgTable('uploadStatus', {
  uploadId: integer().primaryKey().generatedAlwaysAsIdentity(),
  roomId: integer()
    .references(() => ROOMS_TABLE.roomId, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    })
    .notNull(),
  uploadStatus: UPLOAD_STATUS().notNull(),
  parsedInfo: text(),
});

export const MEDIA_TABLE = pgTable(
  'mediaTable',
  {
    mediaId: integer().primaryKey().generatedAlwaysAsIdentity(),
    roomId: integer()
      .references(() => ROOMS_TABLE.roomId, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      })
      .notNull(),
    videoUrl: varchar({length: 2048}).notNull(),
    videoMime: varchar({length: 256}).notNull(),
    subUrl: varchar({length: 2048}),
    subLang: varchar({length: 256}),
    subLabel: varchar({length: 256}),
  },
  table => [
    {
      mediaRoomIdIndex: index('mediaRoomIdIndex').on(table.roomId),
    },
  ],
);
