import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Catalogue partagé des livres déjà renvoyés par Google Books, tous utilisateurs confondus.
 * Il sert de cache devant l'API, dont le quota quotidien est limité : un livre déjà vu par
 * un utilisateur ne coûte plus aucun appel aux suivants.
 *
 * Identifiant : l'id de volume Google, et non l'ISBN — une partie des résultats n'en a pas,
 * et Google renvoie parfois deux volumes pour un même ISBN. L'index sur `isbn` n'est donc
 * pas unique.
 *
 * Pas de propriétaire : ce sont des métadonnées publiques, distinctes de la bibliothèque de
 * chaque utilisateur (table `book`), qui en recopie les champs à l'ajout. Suppression
 * physique uniquement, jamais déclenchée par un utilisateur.
 */
export const catalogBook = pgTable(
  "catalog_book",
  {
    id: text("id").primaryKey(),
    isbn: text("isbn"),
    title: text("title").notNull(),
    /** Sous-titre Google, qui porte souvent la saga : « Le cycle de Dune, tome 2 ». */
    subtitle: text("subtitle"),
    authors: text("authors").array().notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    pageCount: integer("page_count"),
    publishedDate: text("published_date"),
    genres: text("genres").array(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("catalog_book_isbn_idx").on(table.isbn)],
);

/**
 * Résultats mis en cache d'une recherche Google Books, par requête normalisée (voir
 * `searchCacheKey`) : la liste ordonnée des ids du catalogue renvoyés. Une liste vide est
 * aussi conservée, pour qu'un ISBN inconnu de Google ne soit pas redemandé à chaque scan.
 *
 * Table technique, sans lien avec un utilisateur : suppression physique, purgée des entrées
 * expirées par la tâche cron de nettoyage.
 */
export const catalogSearch = pgTable(
  "catalog_search",
  {
    query: text("query").primaryKey(),
    bookIds: text("book_ids").array().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [index("catalog_search_expiresAt_idx").on(table.expiresAt)],
);
