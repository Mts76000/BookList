import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendChangeEmailVerification,
  sendSignupAdminNotification,
} from "@/lib/email";
import { logAuditEvent } from "@/lib/audit-log";
import { account } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import {
  isBcryptHash,
  rehashToScrypt,
  verifyPasswordWithLegacySupport,
} from "@/lib/legacy-password";
import { createLocalAccountIssuer } from "better-auth/db";
import { logger } from "@/lib/logger";

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1h
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
    // Accepte aussi les hashs bcrypt hérités de BookList v1 (voir lib/legacy-password.ts).
    // Seul `verify` est surchargé : les nouveaux mots de passe restent hachés en scrypt par
    // better-auth, donc le parc bascule tout seul au fil des connexions.
    password: {
      verify: verifyPasswordWithLegacySupport,
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60, // 1h
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false, // never settable by the client
      },
      // Champs métier BookList. Tous en `input: false` : ils sont écrits par les routes
      // API du projet via Drizzle, jamais depuis le corps d'une requête better-auth.
      initialBooksRead: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
      hasSeenOnboarding: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      isAnonymized: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      anonymizedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendChangeEmailVerification(user.email, newEmail, url);
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (used when rememberMe is true)
    updateAge: 60 * 60 * 24, // refresh once per day of activity
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await sendSignupAdminNotification(user.email);
        },
      },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Migration progressive des mots de passe v1 : une connexion qui a réussi contre un
      // hash bcrypt le remplace immédiatement par un hash scrypt. Le mot de passe en clair
      // n'est disponible qu'ici, dans le corps de la requête de connexion.
      if (ctx.path === "/sign-in/email") {
        const session = ctx.context.newSession;
        const password = ctx.body?.password;
        if (session && typeof password === "string") {
          try {
            const credential = await db.query.account.findFirst({
              where: and(
                eq(account.userId, session.user.id),
                eq(account.providerId, "credential"),
                eq(account.issuer, createLocalAccountIssuer("credential")),
              ),
            });
            if (credential?.password && isBcryptHash(credential.password)) {
              await db
                .update(account)
                .set({ password: await rehashToScrypt(password) })
                .where(eq(account.id, credential.id));
            }
          } catch (err) {
            // Un échec de re-hachage ne doit jamais faire échouer la connexion : le hash
            // bcrypt reste valide et la prochaine connexion réessaiera.
            logger.error({ err }, "Failed to upgrade legacy bcrypt password hash");
          }
        }
      }

      if (ctx.path === "/change-password") {
        const session = ctx.context.newSession ?? ctx.context.session;
        if (session) {
          await logAuditEvent({
            userId: session.user.id,
            action: "user.change_password",
            entityType: "user",
            entityId: session.user.id,
            ip: ctx.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
            userAgent: ctx.request?.headers.get("user-agent") ?? null,
          });
        }
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
