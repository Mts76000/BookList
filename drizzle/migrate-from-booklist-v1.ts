import { config } from "dotenv";
config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env.local", quiet: true });

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createLocalAccountIssuer } from "better-auth/db";
import * as schema from "./schema";

/**
 * Migration des données de BookList v1 (NextAuth + Prisma) vers le schéma v2 (better-auth +
 * Drizzle).
 *
 * Lit la base v1 via LEGACY_DATABASE_URL et écrit dans la base v2 (DATABASE_URL). L'ancienne
 * base n'est jamais modifiée : en cas de problème, elle reste le filet de sécurité.
 *
 * Le script est rejouable : les identifiants de la v1 (des cuid) sont conservés, et chaque
 * insertion ignore les lignes déjà présentes. Relancer après un échec partiel reprend donc
 * là où il s'était arrêté, sans créer de doublon ni casser une URL /books/<id> existante.
 *
 *   LEGACY_DATABASE_URL=postgres://… npx tsx drizzle/migrate-from-booklist-v1.ts [--dry-run]
 */

/** Comptes promus administrateurs à la migration. */
const ADMIN_EMAILS = (process.env.MIGRATION_ADMIN_EMAILS ?? "contact@mathis-lamotte.fr")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

interface LegacyUser {
  id: string;
  email: string;
  password: string;
  name: string | null;
  initialBooksRead: number;
  hasSeenOnboarding: boolean;
  isAnonymized: boolean;
  anonymizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LegacyBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  description: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  genre: string | null;
  publishedDate: string | null;
  userRating: number | null;
  userReadDate: Date | null;
  userStartDate: Date | null;
  userEndDate: Date | null;
  status: "TO_READ" | "READING" | "FINISHED";
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface LegacyComment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  bookId: string;
  userId: string;
}

interface LegacyActivity {
  id: string;
  pagesRead: number;
  /** Déjà réduit au jour civil par la requête SQL — voir le commentaire de sa lecture. */
  date: string;
  userId: string;
}

export interface MigrationReport {
  users: number;
  accounts: number;
  books: number;
  comments: number;
  activities: number;
  admins: string[];
  anonymized: number;
}

export async function migrateFromV1(options: { dryRun?: boolean } = {}): Promise<MigrationReport> {
  const legacyUrl = process.env.LEGACY_DATABASE_URL;
  if (!legacyUrl) throw new Error("LEGACY_DATABASE_URL is not set.");
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl) throw new Error("DATABASE_URL is not set.");
  if (legacyUrl === targetUrl) {
    throw new Error("LEGACY_DATABASE_URL and DATABASE_URL point to the same database.");
  }

  const legacyPool = new Pool({ connectionString: legacyUrl });
  const targetPool = new Pool({ connectionString: targetUrl });
  const db = drizzle(targetPool, { schema });

  try {
    // Garde-fou : la table ReadingSession de la v1 n'est reprise dans aucun schéma v2, parce
    // qu'aucune ligne de code de la v1 ne l'écrit ni ne la lit. Si elle contient malgré tout
    // des données, on refuse de continuer plutôt que de les faire disparaître en silence.
    const orphanSessions = await legacyPool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM "ReadingSession"',
    );
    const orphanCount = Number(orphanSessions.rows[0].count);
    if (orphanCount > 0) {
      throw new Error(
        `La table ReadingSession contient ${orphanCount} ligne(s), qu'aucun schéma v2 n'accueille. ` +
          "Migration interrompue : décidez explicitement de leur sort avant de relancer.",
      );
    }

    const [users, books, comments, activities] = await Promise.all([
      legacyPool.query<LegacyUser>('SELECT * FROM "User" ORDER BY "createdAt"'),
      legacyPool.query<LegacyBook>('SELECT * FROM "Book" ORDER BY "createdAt"'),
      legacyPool.query<LegacyComment>('SELECT * FROM "Comment" ORDER BY "createdAt"'),
      // Le jour civil est extrait par Postgres, et non côté JavaScript : le pilote `pg`
      // convertit un `timestamp without time zone` dans le fuseau du processus, si bien
      // qu'un 2024-02-10 00:00:00 lu depuis un serveur en UTC+1 devenait un 2024-02-09.
      legacyPool.query<LegacyActivity>(
        'SELECT id, "pagesRead", to_char(date, \'YYYY-MM-DD\') AS date, "userId" ' +
          'FROM "ReadingActivity" ORDER BY date',
      ),
    ]);

    const admins = users.rows
      .filter((row) => ADMIN_EMAILS.includes(row.email.toLowerCase()))
      .map((row) => row.email);
    const anonymized = users.rows.filter((row) => row.isAnonymized).length;

    const report: MigrationReport = {
      users: users.rows.length,
      accounts: users.rows.filter((row) => !row.isAnonymized).length,
      books: books.rows.length,
      comments: comments.rows.length,
      activities: activities.rows.length,
      admins,
      anonymized,
    };

    if (options.dryRun) return report;

    await db.transaction(async (tx) => {
      for (const row of users.rows) {
        await tx
          .insert(schema.user)
          .values({
            id: row.id,
            // La v1 autorisait un nom vide ; la v2 le rend obligatoire.
            name: row.name ?? (row.isAnonymized ? "Compte supprimé" : "Lecteur"),
            email: row.email,
            // Les comptes migrés sont considérés comme vérifiés : ils existaient avant que la
            // vérification d'email soit obligatoire, et les bloquer reviendrait à les exclure.
            emailVerified: true,
            role: ADMIN_EMAILS.includes(row.email.toLowerCase()) ? "admin" : "user",
            initialBooksRead: row.initialBooksRead,
            hasSeenOnboarding: row.hasSeenOnboarding,
            isAnonymized: row.isAnonymized,
            anonymizedAt: row.anonymizedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
          .onConflictDoNothing({ target: schema.user.id });

        // Un compte anonymisé n'a plus de moyen de connexion : la v1 y avait mis un mot de
        // passe aléatoire, le recopier n'aurait aucun sens.
        if (row.isAnonymized) continue;

        // L'identifiant d'un compte est tiré au hasard : `onConflictDoNothing` sur cette
        // colonne ne pourrait donc jamais détecter un doublon, et chaque relance du script
        // ajouterait un moyen de connexion de plus. On vérifie explicitement son existence.
        const existingCredential = await tx.query.account.findFirst({
          where: and(
            eq(schema.account.userId, row.id),
            eq(schema.account.providerId, "credential"),
          ),
          columns: { id: true },
        });
        if (existingCredential) continue;

        await tx
          .insert(schema.account)
          .values({
            id: randomUUID(),
            accountId: row.id,
            providerId: "credential",
            // Indispensable depuis better-auth 1.7 : la connexion cherche le compte par
            // (providerId, issuer, accountId). Un issuer vide fait échouer l'authentification
            // avec un « User not found » trompeur.
            issuer: createLocalAccountIssuer("credential"),
            userId: row.id,
            // Hash bcrypt conservé tel quel : lib/legacy-password.ts sait le vérifier et le
            // remplace par un hash scrypt à la première connexion réussie.
            password: row.password,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
          .onConflictDoNothing({ target: schema.account.id });
      }

      for (const row of books.rows) {
        await tx
          .insert(schema.book)
          .values({
            id: row.id,
            title: row.title,
            author: row.author,
            isbn: row.isbn,
            description: row.description,
            coverUrl: row.coverUrl,
            pageCount: row.pageCount,
            genre: row.genre,
            publishedDate: row.publishedDate,
            userRating: row.userRating,
            userReadDate: row.userReadDate,
            userStartDate: row.userStartDate,
            userEndDate: row.userEndDate,
            status: row.status,
            userId: row.userId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
          .onConflictDoNothing({ target: schema.book.id });
      }

      for (const row of comments.rows) {
        await tx
          .insert(schema.comment)
          .values({
            id: row.id,
            content: row.content,
            bookId: row.bookId,
            userId: row.userId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          })
          .onConflictDoNothing({ target: schema.comment.id });
      }

      for (const row of activities.rows) {
        await tx
          .insert(schema.readingActivity)
          .values({
            id: row.id,
            pagesRead: row.pagesRead,
            // La v1 stockait un timestamp ramené à minuit ; la v2 stocke un jour civil.
            date: row.date,
            userId: row.userId,
          })
          .onConflictDoNothing({ target: schema.readingActivity.id });
      }
    });

    return report;
  } finally {
    await legacyPool.end();
    await targetPool.end();
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const dryRun = process.argv.includes("--dry-run");
  migrateFromV1({ dryRun })
    .then((report) => {
      console.log(
        dryRun ? "\n--- Simulation (aucune écriture) ---" : "\n--- Migration terminée ---",
      );
      console.log(`Utilisateurs      : ${report.users} (dont ${report.anonymized} anonymisé(s))`);
      console.log(`Moyens de connexion: ${report.accounts}`);
      console.log(`Livres            : ${report.books}`);
      console.log(`Notes             : ${report.comments}`);
      console.log(`Jours d'activité  : ${report.activities}`);
      console.log(
        `Administrateurs   : ${report.admins.length > 0 ? report.admins.join(", ") : "aucun"}`,
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
