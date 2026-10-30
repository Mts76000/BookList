CREATE TABLE "quote" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"page" integer,
	"book_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"target" integer NOT NULL,
	"filter" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "series_name" text;--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "series_index" integer;--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "series_total" integer;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_book_id_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_challenge" ADD CONSTRAINT "reading_challenge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_bookId_idx" ON "quote" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "quote_userId_idx" ON "quote" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reading_challenge_userId_year_idx" ON "reading_challenge" USING btree ("user_id","year");--> statement-breakpoint
CREATE INDEX "push_subscription_userId_idx" ON "push_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "book_userId_seriesName_idx" ON "book" USING btree ("user_id","series_name");