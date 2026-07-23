CREATE TABLE "universal_links" (
	"service" varchar(20) NOT NULL,
	"type" varchar(20) NOT NULL,
	"item_id" varchar(64) NOT NULL,
	"title" varchar(500) NOT NULL,
	"artist" varchar(500),
	"artwork_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "universal_links_service_type_item_id_pk" PRIMARY KEY("service","type","item_id")
);
--> statement-breakpoint
ALTER TABLE "shared_playlists" ADD COLUMN "created_by_name" varchar(255);--> statement-breakpoint
ALTER TABLE "shared_playlists" ADD COLUMN "playlist_image" text;--> statement-breakpoint
ALTER TABLE "shared_playlists" ADD COLUMN "expires_at" timestamp;