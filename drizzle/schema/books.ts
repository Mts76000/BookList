import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "@/drizzle/schema/auth";

/**
 * Statut de lecture d'un livre. Les valeurs reprennent à l'identique l'enum BookStatus de
 * BookList v1 (Prisma) : la migration des données recopie la colonne telle quelle.
 */
export const bookStatus = pgEnum("book_status", ["TO_READ", "READING", "FINISHED"]);

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
    userRating: integer("user_rating"),
    // Conservé de la v1 : plus écrit par l'application, mais d'anciennes lignes peuvent
    // encore porter une valeur qu'on ne veut pas perdre à la migration.
    userReadDate: timestamp("user_read_date"),
    userStartDate: timestamp("user_start_date"),
    userEndDate: timestamp("user_end_date"),
    status: bookStatus("status").notNull().default("FINISHED"),
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
