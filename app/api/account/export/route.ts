import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  book,
  comment,
  quote,
  readingActivity,
  readingChallenge,
  readingGoal,
  session as sessionTable,
  user,
  yearFavorite,
} from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { withApiErrorHandling } from "@/lib/api-response";

/**
 * Export JSON de toutes les données de l'utilisateur (portabilité RGPD) : compte, sessions,
 * et données métier BookList. Toute nouvelle entité rattachée à l'utilisateur doit y être
 * ajoutée. Les identifiants de paiement Stripe en sont exclus : ce ne sont pas des données
 * fournies par l'utilisateur, et les factures sont consultables dans le portail Stripe.
 */
export const GET = withApiErrorHandling(async () => {
  const authSession = await requireAuth();

  const [userRow] = await db.select().from(user).where(eq(user.id, authSession.user.id));
  const sessions = await db
    .select({
      id: sessionTable.id,
      createdAt: sessionTable.createdAt,
      ipAddress: sessionTable.ipAddress,
      userAgent: sessionTable.userAgent,
    })
    .from(sessionTable)
    .where(eq(sessionTable.userId, authSession.user.id));

  const userId = authSession.user.id;
  const [books, comments, quotes, activities, goals, favorites, challenges] = await Promise.all([
    db.select().from(book).where(eq(book.userId, userId)),
    db.select().from(comment).where(eq(comment.userId, userId)),
    db.select().from(quote).where(eq(quote.userId, userId)),
    db.select().from(readingActivity).where(eq(readingActivity.userId, userId)),
    db.select().from(readingGoal).where(eq(readingGoal.userId, userId)),
    db.select().from(yearFavorite).where(eq(yearFavorite.userId, userId)),
    db.select().from(readingChallenge).where(eq(readingChallenge.userId, userId)),
  ]);

  const { stripeCustomerId, stripeSubscriptionId, ...userData } = userRow;
  void stripeCustomerId;
  void stripeSubscriptionId;

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: userData,
    sessions,
    books,
    comments,
    quotes,
    readingActivity: activities,
    readingGoals: goals,
    yearFavorites: favorites,
    readingChallenges: challenges,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=account-export.json",
    },
  });
});
