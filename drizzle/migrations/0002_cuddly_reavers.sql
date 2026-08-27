CREATE TYPE "public"."book_status" AS ENUM('TO_READ', 'READING', 'FINISHED');--> statement-breakpoint
CREATE TABLE "book" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"isbn" text,
	"description" text,
	"cover_url" text,
	"page_count" integer,
	"genre" text,
	"published_date" text,
	"user_rating" integer,
	"user_read_date" timestamp,
	"user_start_date" timestamp,
	"user_end_date" timestamp,
	"status" "book_status" DEFAULT 'FINISHED' NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"book_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"pages_read" integer DEFAULT 0 NOT NULL,
	"date" date NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "initial_books_read" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "has_seen_onboarding" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_anonymized" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "anonymized_at" timestamp;--> statement-breakpoint
ALTER TABLE "book" ADD CONSTRAINT "book_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_book_id_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_activity" ADD CONSTRAINT "reading_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_userId_isbn_idx" ON "book" USING btree ("user_id","isbn");--> statement-breakpoint
CREATE INDEX "book_userId_idx" ON "book" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "book_userRating_idx" ON "book" USING btree ("user_rating");--> statement-breakpoint
CREATE INDEX "book_status_idx" ON "book" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comment_bookId_idx" ON "comment" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "comment_userId_idx" ON "comment" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_activity_userId_date_idx" ON "reading_activity" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "reading_activity_userId_idx" ON "reading_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reading_activity_date_idx" ON "reading_activity" USING btree ("date");