import { and, count, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, user } from "@/drizzle/schema";

export interface AdminStats {
  totalUsers: number;
  /** Comptes anonymisés, exclus des utilisateurs actifs. */
  deletedUsers: number;
  newUsersLast30Days: number;
  verifiedUsers: number;
  admins: number;
  totalBooks: number;
  booksAddedLast30Days: number;
  /** Utilisateurs ayant ajouté au moins un livre au cours des 30 derniers jours. */
  activeUsersLast30Days: number;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/** Chiffres globaux du back-office. Réservé aux appelants déjà passés par requireRole("admin"). */
export async function getAdminStats(): Promise<AdminStats> {
  const since = daysAgo(30);

  const [
    [{ value: totalUsers }],
    [{ value: deletedUsers }],
    [{ value: newUsersLast30Days }],
    [{ value: verifiedUsers }],
    [{ value: admins }],
    [{ value: totalBooks }],
    [{ value: booksAddedLast30Days }],
    [{ value: activeUsersLast30Days }],
  ] = await Promise.all([
    db.select({ value: count() }).from(user),
    db
      .select({ value: count() })
      .from(user)
      .where(sql`${user.isAnonymized} = true`),
    db.select({ value: count() }).from(user).where(gte(user.createdAt, since)),
    db
      .select({ value: count() })
      .from(user)
      .where(sql`${user.emailVerified} = true`),
    db
      .select({ value: count() })
      .from(user)
      .where(sql`${user.role} = 'admin'`),
    db.select({ value: count() }).from(book),
    db.select({ value: count() }).from(book).where(gte(book.createdAt, since)),
    db
      .select({ value: sql<number>`count(distinct ${book.userId})::int` })
      .from(book)
      .where(and(gte(book.createdAt, since))),
  ]);

  return {
    totalUsers,
    deletedUsers,
    newUsersLast30Days,
    verifiedUsers,
    admins,
    totalBooks,
    booksAddedLast30Days,
    activeUsersLast30Days,
  };
}
