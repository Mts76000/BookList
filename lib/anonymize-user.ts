import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { account, book, comment, readingActivity, session, user } from "@/drizzle/schema";

/** Domaine de façade des comptes anonymisés — il n'existe pas, rien ne peut y être envoyé. */
const ANONYMIZED_EMAIL_DOMAIN = "anonymized.booklist";

/**
 * Supprime un compte par anonymisation — dérogation assumée au hard delete du socle,
 * documentée dans AGENTS.md.
 *
 * La ligne `user` survit, vidée de toute donnée personnelle, avec `isAnonymized` et
 * `anonymizedAt`. On la conserve pour que les comptes déjà supprimés en v1 restent migrables
 * tels quels, et pour que l'adresse e-mail libérée ne puisse pas servir à rouvrir un compte
 * se faisant passer pour l'ancien. Les données métier et tous les moyens de connexion sont,
 * eux, réellement supprimés : ce qui reste ne permet ni de se reconnecter, ni de remonter à
 * une personne.
 *
 * Partagé par la suppression volontaire (`/api/account`) et par la suppression administrative
 * (`/api/admin/users/[id]`) : les deux chemins doivent laisser la base dans le même état.
 */
export async function anonymizeUser(userId: string): Promise<void> {
  // Transaction : un compte à moitié anonymisé laisserait des données personnelles derrière
  // lui tout en ayant l'air supprimé.
  await db.transaction(async (tx) => {
    await tx.delete(comment).where(eq(comment.userId, userId));
    await tx.delete(readingActivity).where(eq(readingActivity.userId, userId));
    await tx.delete(book).where(eq(book.userId, userId));
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
}
