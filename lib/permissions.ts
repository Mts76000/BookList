import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * The only sanctioned way to check "is this request authenticated" in a route or page.
 * Throws UnauthorizedError if there's no valid session — never check for a session
 * ad hoc elsewhere.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedError();
  return session;
}

/**
 * The only sanctioned way to check "does this user have role X" in a route or page.
 * Always calls requireAuth() first, then throws ForbiddenError if the role doesn't match.
 */
export async function requireRole(role: "admin"): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== role) throw new ForbiddenError();
  return session;
}

/**
 * Variante de requireAuth() destinée aux pages (Server Components) : redirige vers la
 * connexion au lieu de lever, en conservant le chemin demandé pour y revenir ensuite.
 *
 * Sans elle, chaque page protégée doit envelopper requireAuth() dans un try/catch, et celle
 * qui l'oublie affiche une page d'erreur générique à un visiteur simplement déconnecté —
 * typiquement après la révocation d'une session à distance.
 */
export async function requireAuthPage(redirectTo?: string): Promise<Session> {
  try {
    return await requireAuth();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect(redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login");
    }
    throw err;
  }
}

/**
 * For pages that render differently for signed-in vs. anonymous visitors without gating
 * access (e.g. the homepage showing "My account" instead of "Log in"). Returns null instead
 * of throwing — use requireAuth() instead when the page/route actually requires a session.
 */
export async function getOptionalSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}
