ALTER TYPE "public"."book_status" ADD VALUE 'ABANDONED';--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "current_page" integer;--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "format" text;--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "tags" text[];