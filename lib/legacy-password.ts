import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "better-auth/crypto";

/**
 * Compatibilité avec les mots de passe de BookList v1.
 *
 * La v1 (NextAuth) hachait les mots de passe en bcrypt ; better-auth utilise scrypt. Plutôt
 * que d'imposer une réinitialisation à tous les comptes migrés, on accepte les deux formats
 * à la connexion et on remplace le hash bcrypt par un hash scrypt dès la première connexion
 * réussie. Le module entier est destiné à disparaître : quand plus aucune ligne `account` ne
 * porte de hash bcrypt, il suffit de le supprimer et de retirer l'option `password` de
 * lib/auth.ts (voir AGENTS.md, dérogations assumées).
 */

/** Les hashs bcrypt commencent tous par $2a$, $2b$, $2x$ ou $2y$ ; scrypt, jamais. */
export function isBcryptHash(hash: string): boolean {
  return /^\$2[abxy]\$/.test(hash);
}

/**
 * Vérifie un mot de passe contre un hash bcrypt (v1) ou scrypt (better-auth), selon le
 * format du hash stocké. Branché sur `emailAndPassword.password.verify`.
 */
export async function verifyPasswordWithLegacySupport({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  if (isBcryptHash(hash)) {
    return bcrypt.compare(password, hash);
  }
  return verifyPassword({ hash, password });
}

/** Re-hache en scrypt un mot de passe validé contre un hash bcrypt. */
export async function rehashToScrypt(password: string): Promise<string> {
  return hashPassword(password);
}
