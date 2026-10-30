CREATE TABLE "year_favorite" (
	"id" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"book_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "year_favorite" ADD CONSTRAINT "year_favorite_book_id_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "year_favorite" ADD CONSTRAINT "year_favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "year_favorite_userId_year_idx" ON "year_favorite" USING btree ("user_id","year");--> statement-breakpoint
CREATE INDEX "year_favorite_bookId_idx" ON "year_favorite" USING btree ("book_id");