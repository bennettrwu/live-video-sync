CREATE TYPE "public"."upload_status" AS ENUM('uploading', 'uploadFailed', 'parsing', 'awaitParams', 'processing', 'processingFailed', 'done');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"user_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accounts_user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"password_hash" varchar(256) NOT NULL,
	"username" varchar(256) NOT NULL,
	CONSTRAINT "accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mediaTable" (
	"room_id" integer NOT NULL,
	"index" integer GENERATED ALWAYS AS IDENTITY (sequence name "mediaTable_index_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"video_url" varchar(2048) NOT NULL,
	"video_mime" varchar(256) NOT NULL,
	"sub_url" varchar(2048),
	"sub_lang" varchar(256),
	"sub_label" varchar(256)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roomUsers" (
	"room_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
	"room_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rooms_room_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"owner_id" integer NOT NULL,
	"room_name" varchar(256) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"token" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires" timestamp (0) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uploadStatus" (
	"upload_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "uploadStatus_upload_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"room_id" integer NOT NULL,
	"upload_status" "upload_status" NOT NULL,
	"parsed_info" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mediaTable" ADD CONSTRAINT "mediaTable_room_id_rooms_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roomUsers" ADD CONSTRAINT "roomUsers_room_id_rooms_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roomUsers" ADD CONSTRAINT "roomUsers_user_id_accounts_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("user_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rooms" ADD CONSTRAINT "rooms_owner_id_accounts_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."accounts"("user_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_accounts_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("user_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uploadStatus" ADD CONSTRAINT "uploadStatus_room_id_rooms_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
