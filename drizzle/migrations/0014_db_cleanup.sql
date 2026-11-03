DROP INDEX "book_userId_idx";--> statement-breakpoint
DROP INDEX "book_userRating_idx";--> statement-breakpoint
DROP INDEX "book_status_idx";--> statement-breakpoint
-- user_read_date est la date de lecture de la v1, jamais écrite depuis : elle devient la date
-- de fin des livres lus ou abandonnés qui n'en ont pas, au lieu d'être perdue.
UPDATE "book" SET "user_end_date" = "user_read_date"
  WHERE "user_end_date" IS NULL AND "user_read_date" IS NOT NULL
    AND "status" IN ('FINISHED', 'ABANDONED');--> statement-breakpoint
ALTER TABLE "book" DROP COLUMN "user_read_date";--> statement-breakpoint
DROP INDEX "reading_activity_userId_date_idx";--> statement-breakpoint
DROP INDEX "reading_activity_userId_idx";--> statement-breakpoint
DROP INDEX "reading_activity_date_idx";--> statement-breakpoint
-- La suppression de `id` emporte l'ancienne clé primaire : elle doit précéder la nouvelle.
-- L'index unique (user_id, date) garantissait déjà qu'il n'y a aucun doublon.
ALTER TABLE "reading_activity" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "reading_activity" ADD CONSTRAINT "reading_activity_user_id_date_pk" PRIMARY KEY("user_id","date");
