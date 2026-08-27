import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account, book, comment, readingActivity, session, user } from "@/drizzle/schema";
import { requireAuth } from "@/lib/permissions";
import { apiSuccess, apiError, withApiErrorHandling } from "@/lib/api-response";
import { logAuditEvent, requestMetadata } from "@/lib/audit-log";

/** Domaine de façade des comptes anonymisés — il n'existe pas, donc rien ne peut y être envoyé. */
const ANONYMIZED_EMAIL_DOMAIN = "anonymized.booklist";

/**
 * Supprime le compte de l'utilisateur courant, par **anonymisation** et non par suppression
 * physique — dérogation assumée au défaut du socle, documentée dans AGENTS.md.
 *
 * Le comportement vient de BookList v1 : la ligne `user` survit, vidée de toute donnée
 * personnelle, avec `isAnonymized` / `anonymizedAt`. On la conserve pour que les comptes
 * déjà supprimés en v1 restent migrables tels quels, et pour que l'adresse email libérée ne
 * puisse pas être réutilisée pour rouvrir un compte se faisant passer pour l'ancien.
 *
 * Les données métier (livres, notes, activité de lecture) et les moyens de connexion
 * (sessions, comptes OAuth et mot de passe) sont, eux, bel et bien supprimés : ce qui reste
 * ne permet ni de se reconnecter, ni de remonter à une personne.
 */
export const DELETE = withApiErrorHandling(async (request: Request) => {
  const authSession = await requireAuth();
  const { ip, userAgent } = requestMetadata(request);
  const userId = authSession.user.id;

  const current = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!current) return apiError("NOT_FOUND", "Utilisateur introuvable.");
  if (current.isAnonymized) return apiError("CONFLICT", "Ce compte est déjà supprimé.");

  await logAuditEvent({
    userId,
    action: "user.delete_account",
    entityType: "user",
    entityId: userId,
    metadata: { email: current.email },
    ip,
    userAgent,
  });

  // Transaction : un compte à moitié anonymisé laisserait des données personnelles
  // derrière lui tout en ayant l'air supprimé.
  await db.transaction(async (tx) => {
    await tx.delete(comment).where(eq(comment.userId, userId));
    await tx.delete(readingActivity).where(eq(readingActivity.userId, userId));
    await tx.delete(book).where(eq(book.userId, userId));
    // Coupe tout moyen de se reconnecter : mots de passe et identités OAuth.
    await tx.delete(account).where(eq(account.userId, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx
      .update(user)
      .set({
        email: `deleted-${userId}@${ANONYMIZED_EMAIL_DOMAIN}`,
        name: "Compte supprimé",
        image: null,
        emailVerified: false,
        initialBooksRead: 0,
        hasSeenOnboarding: false,
        isAnonymized: true,
        anonymizedAt: new Date(),
      })
      .where(eq(user.id, userId));
  });

  return apiSuccess(null, "Compte supprimé.");
});
