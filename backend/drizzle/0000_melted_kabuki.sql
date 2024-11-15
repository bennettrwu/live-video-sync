CREATE TYPE "public"."upload_status" AS ENUM('uploading', 'uploadFailed', 'parsing', 'awaitParams', 'processing', 'processingFailed', 'done');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"userId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accounts_userId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"passwordHash" varchar(256) NOT NULL,
	"username" varchar(16) NOT NULL,
	CONSTRAINT "accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mediaTable" (
	"mediaId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mediaTable_mediaId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roomId" integer NOT NULL,
	"videoUrl" varchar(2048) NOT NULL,
	"videoMime" varchar(256) NOT NULL,
	"subUrl" varchar(2048),
	"subLang" varchar(256),
	"subLabel" varchar(256)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
	"roomId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rooms_roomId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ownerId" integer NOT NULL,
	"roomName" varchar(256) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roomUsers" (
	"roomId" integer NOT NULL,
	"userId" integer NOT NULL,
	CONSTRAINT "roomUsers_roomId_userId_pk" PRIMARY KEY("roomId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"token" varchar(64) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"expires" timestamp (0) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uploadStatus" (
	"uploadId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "uploadStatus_uploadId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roomId" integer NOT NULL,
	"uploadStatus" "upload_status" NOT NULL,
	"parsedInfo" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mediaTable" ADD CONSTRAINT "mediaTable_roomId_rooms_roomId_fk" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("roomId") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rooms" ADD CONSTRAINT "rooms_ownerId_accounts_userId_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."accounts"("userId") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roomUsers" ADD CONSTRAINT "roomUsers_roomId_rooms_roomId_fk" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("roomId") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roomUsers" ADD CONSTRAINT "roomUsers_userId_accounts_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."accounts"("userId") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_accounts_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."accounts"("userId") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uploadStatus" ADD CONSTRAINT "uploadStatus_roomId_rooms_roomId_fk" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("roomId") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accountsUsernameIndex" ON "accounts" USING btree ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mediaRoomIdIndex" ON "mediaTable" USING btree ("roomId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roomsOwnerIdIndex" ON "rooms" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessionUserIdIndex" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessionExpiresIndex" ON "sessions" USING btree ("expires");--> statement-breakpoint
CREATE VIEW "public"."sessionsView" AS (select "token", "userId", "expires" from "sessions" where "sessions"."expires" > (current_timestamp));