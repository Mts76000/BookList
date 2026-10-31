import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "@/drizzle/schema/auth";

/**
 * Statut de lecture d'un livre. Les valeurs reprennent à l'identique l'enum BookStatus de
 * BookList v1 (Prisma) : la migration des données recopie la colonne telle quelle.
 */
export const bookStatus = pgEnum("book_status", ["TO_READ", "READING", "FINISHED", "ABANDONED"]);

/**
 * Identifiants en `text` et non en `uuid` comme les tables techniques du socle : les données
 * de la v1 sont des cuid, et on les conserve à la migration pour ne casser aucune URL de type
 * /books/<id> déjà partagée ou mise en favori. Les nouvelles lignes reçoivent un UUID v4.
 */
const entityId = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/**
 * Un livre appartient à un et un seul utilisateur — il n'y a pas de catalogue partagé, chaque
 * utilisateur a sa propre ligne même pour un ISBN identique.
 * Suppression : physique, en cascade depuis l'utilisateur. Pas de `deletedAt` — un livre
 * retiré de la bibliothèque n'a aucune valeur à être conservé.
 */
export const book = pgTable(
  "book",
  {
    id: entityId(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    isbn: text("isbn"),
    description: text("description"),
    coverUrl: text("cover_url"),
    pageCount: integer("page_count"),
    genre: text("genre"),
    // Chaîne libre et non une date : l'API Google Books renvoie aussi bien "2019" que
    // "2019-04" ou "2019-04-23", et on affiche la valeur telle qu'elle est publiée.
    publishedDate: text("published_date"),
    // Note sur 5 par pas de 0,5 (demi-étoiles) : `real` représente ces valeurs exactement.
    userRating: real("user_rating"),
    // Conservé de la v1 : plus écrit par l'application, mais d'anciennes lignes peuvent
    // encore porter une valeur qu'on ne veut pas perdre à la migration.
    userReadDate: timestamp("user_read_date"),
    userStartDate: timestamp("user_start_date"),
    userEndDate: timestamp("user_end_date"),
    status: bookStatus("status").notNull().default("FINISHED"),
    // Dernier changement de statut fait dans l'application (ajout compris). Les dates de
    // lecture restent facultatives : c'est le repli du tri par date de lecture quand
    // l'utilisateur ne les a pas saisies. NULL pour un livre importé ou antérieur à la
    // colonne : on ne sait pas quand il a été lu.
    statusChangedAt: timestamp("status_changed_at"),
    // Saga : nom de la série, numéro du tome et nombre de tomes connus. Saisis à la main
    // ou déduits d'un titre Goodreads « Titre (Série, #3) » à l'import.
    // Page où en est la lecture. Mise à jour via /api/books/[id]/progress, qui enregistre
    // aussi les pages lues du jour dans `reading_activity`.
    currentPage: integer("current_page"),
    // Format lu : "paper", "ebook" ou "audio" (voir lib/book-status.ts).
    format: text("format"),
    // Étagères personnelles (« Prêtés », « Favoris »...), reprises des étagères Goodreads et
    // des tags StoryGraph à l'import.
    tags: text("tags").array(),
    seriesName: text("series_name"),
    seriesIndex: integer("series_index"),
    seriesTotal: integer("series_total"),
    // Dernière tentative de compléter la fiche (couverture, pages, résumé) auprès des sources
    // de livres, par lib/library-enrichment.ts. NULL : jamais vérifiée.
    metadataCheckedAt: timestamp("metadata_checked_at"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Un même ISBN ne peut apparaître qu'une fois par bibliothèque. Postgres ne considère
    // pas deux NULL comme égaux : les livres sans ISBN ne sont donc pas contraints.
    uniqueIndex("book_userId_isbn_idx").on(table.userId, table.isbn),
    index("book_userId_idx").on(table.userId),
    index("book_userRating_idx").on(table.userRating),
    index("book_status_idx").on(table.status),
    index("book_userId_seriesName_idx").on(table.userId, table.seriesName),
    index("book_metadataCheckedAt_idx").on(table.metadataCheckedAt),
  ],
);

/**
 * Note personnelle attachée à un livre. Suppression physique en cascade depuis le livre et
 * depuis l'utilisateur.
 */
export const comment = pgTable(
  "comment",
  {
    id: entityId(),
    content: text("content").notNull(),
    bookId: text("book_id")
      .notNull()
      .references(() => book.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("comment_bookId_idx").on(table.bookId),
    index("comment_userId_idx").on(table.userId),
  ],
);

/**
 * Pages lues par utilisateur et par jour, source du graphe de contribution. Une seule ligne
 * par utilisateur et par date : les ajouts successifs incrémentent `pagesRead`.
 * Suppression physique en cascade depuis l'utilisateur.
 */
export const readingActivity = pgTable(
  "reading_activity",
  {
    id: entityId(),
    pagesRead: integer("pages_read").notNull().default(0),
    // Jour civil (`date`) et non timestamp : la v1 stockait un timestamp ramené à minuit
    // dans le fuseau du serveur, ce qui rendait la contrainte d'unicité (userId, date)
    // dépendante du fuseau au moment de l'écriture. Un jour de lecture n'a pas d'heure.
    date: date("date", { mode: "string" }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("reading_activity_userId_date_idx").on(table.userId, table.date),
    index("reading_activity_userId_idx").on(table.userId),
    index("reading_activity_date_idx").on(table.date),
  ],
);

/**
 * Objectif annuel de lecture : un nombre de livres à terminer dans l'année civile. Une ligne
 * par utilisateur et par année, pour garder l'historique des objectifs passés et l'afficher
 * dans le bilan de chaque année.
 * Suppression physique en cascade depuis l'utilisateur, et effacée explicitement à
 * l'anonymisation (la ligne `user` y survit).
 */
export const readingGoal = pgTable(
  "reading_goal",
  {
    id: entityId(),
    year: integer("year").notNull(),
    target: integer("target").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("reading_goal_userId_year_idx").on(table.userId, table.year)],
);

/**
 * Coup de cœur choisi par l'utilisateur pour une année, affiché dans son bilan à la place du
 * choix automatique (le livre le mieux noté). Une ligne par utilisateur et par année.
 * Suppression physique en cascade depuis l'utilisateur et depuis le livre : retirer le livre
 * de la bibliothèque rend la main au choix automatique.
 */
export const yearFavorite = pgTable(
  "year_favorite",
  {
    id: entityId(),
    year: integer("year").notNull(),
    bookId: text("book_id")
      .notNull()
      .references(() => book.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("year_favorite_userId_year_idx").on(table.userId, table.year),
    index("year_favorite_bookId_idx").on(table.bookId),
  ],
);

/**
 * Citation relevée dans un livre, avec la page où elle se trouve.
 * Suppression physique en cascade depuis le livre et depuis l'utilisateur.
 */
export const quote = pgTable(
  "quote",
  {
    id: entityId(),
    content: text("content").notNull(),
    page: integer("page"),
    bookId: text("book_id")
      .notNull()
      .references(() => book.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("quote_bookId_idx").on(table.bookId),
    index("quote_userId_idx").on(table.userId),
  ],
);

/**
 * Défi de lecture personnel (Premium) sur une année : un objectif chiffré d'un type donné
 * (voir `CHALLENGE_KINDS` dans lib/challenges.ts), avec un filtre pour les types qui en
 * prennent un (genre, auteur). La progression se calcule à partir des livres terminés,
 * rien n'est stocké en double.
 * Suppression physique en cascade depuis l'utilisateur.
 */
export const readingChallenge = pgTable(
  "reading_challenge",
  {
    id: entityId(),
    year: integer("year").notNull(),
    title: text("title").notNull(),
    kind: text("kind").notNull(),
    target: integer("target").notNull(),
    filter: text("filter"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("reading_challenge_userId_year_idx").on(table.userId, table.year)],
);

/**
 * Relations déclarées pour l'API `db.query...with` de Drizzle. Sans elles, un `with:
 * { comments: true }` échoue à l'exécution — et le typecheck ne l'aurait pas signalé.
 */
export const bookRelations = relations(book, ({ one, many }) => ({
  user: one(user, { fields: [book.userId], references: [user.id] }),
  comments: many(comment),
  quotes: many(quote),
}));

export const quoteRelations = relations(quote, ({ one }) => ({
  book: one(book, { fields: [quote.bookId], references: [book.id] }),
  user: one(user, { fields: [quote.userId], references: [user.id] }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  book: one(book, { fields: [comment.bookId], references: [book.id] }),
  user: one(user, { fields: [comment.userId], references: [user.id] }),
}));

export const readingGoalRelations = relations(readingGoal, ({ one }) => ({
  user: one(user, { fields: [readingGoal.userId], references: [user.id] }),
}));

export const readingActivityRelations = relations(readingActivity, ({ one }) => ({
  user: one(user, { fields: [readingActivity.userId], references: [user.id] }),
}));
