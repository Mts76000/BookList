CREATE TABLE "series_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"volumes" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_lookup" (
	"title_key" text PRIMARY KEY NOT NULL,
	"series_ids" text[] NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "series_lookup_expiresAt_idx" ON "series_lookup" USING btree ("expires_at");