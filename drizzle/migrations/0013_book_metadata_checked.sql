ALTER TABLE "book" ADD COLUMN "metadata_checked_at" timestamp;--> statement-breakpoint
CREATE INDEX "book_metadataCheckedAt_idx" ON "book" USING btree ("metadata_checked_at");