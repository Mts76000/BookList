CREATE TABLE "catalog_book" (
	"id" text PRIMARY KEY NOT NULL,
	"isbn" text,
	"title" text NOT NULL,
	"authors" text[] NOT NULL,
	"description" text,
	"cover_url" text,
	"page_count" integer,
	"published_date" text,
	"genres" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_search" (
	"query" text PRIMARY KEY NOT NULL,
	"book_ids" text[] NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "catalog_book_isbn_idx" ON "catalog_book" USING btree ("isbn");--> statement-breakpoint
CREATE INDEX "catalog_search_expiresAt_idx" ON "catalog_search" USING btree ("expires_at");