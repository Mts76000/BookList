ALTER TABLE "book" ALTER COLUMN "user_rating" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "status_changed_at" timestamp;--> statement-breakpoint
-- La recherche interroge désormais Google Books, Open Library et la BnF : on vide le cache
-- des recherches (table technique) pour que les anciens résultats, Google seul, ne soient
-- pas resservis pendant encore une semaine.
DELETE FROM "catalog_search";
--> statement-breakpoint
-- La recherche des sagas sur Wikidata accepte désormais le nom de la saga et les titres
-- nettoyés de leur tomaison : les « aucune saga » mémorisés avec l'ancienne requête sont
-- effacés (table technique, les sagas elles-mêmes restent dans series_catalog).
DELETE FROM "series_lookup";
