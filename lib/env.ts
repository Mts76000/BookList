import { z } from "zod";

// Treats an empty string the same as "unset" for optional vars (a var left blank in
// .env.local, e.g. `UPSTASH_REDIS_REST_URL=`, should not fail format validation like z.url()).
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),
  // Used in page titles, OG tags, and the admin signup notification email, so every
  // project built from this starter shows up in its own emails/metadata instead of
  // "Starter" — set once per project instead of hunting down every hardcoded string.
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Starter"),
  // Set to "true" on the Coolify preview/staging environment (see README) to force
  // noindex regardless of NODE_ENV, which is "production" there too.
  NEXT_PUBLIC_IS_PREVIEW: optional(z.enum(["true", "false"])),

  DATABASE_URL: z.url(),

  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Optional: raises the Google Books API quota for the book search. Without it the search
  // still works but hits anonymous rate limits (HTTP 429) under load.
  GOOGLE_BOOKS_API_KEY: optional(z.string().min(1)),

  NEXT_PUBLIC_UMAMI_WEBSITE_ID: optional(z.string().min(1)),

  RESEND_API_KEY: z.string().min(1),
  CONTACT_EMAIL: z.email(),

  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),

  CRON_SECRET: z.string().min(16),

  UPSTASH_REDIS_REST_URL: optional(z.url()),
  UPSTASH_REDIS_REST_TOKEN: optional(z.string().min(1)),

  // Optional: shows a "Buy me a coffee" widget on the account page when set.
  NEXT_PUBLIC_BUYMEACOFFEE_SLUG: optional(z.string().min(1)),

  // Opt-in: shows a dismissible "Install the app" popup once the browser reports the PWA
  // as installable. Off by default — not every project wants an unprompted popup.
  NEXT_PUBLIC_PWA_INSTALL_PROMPT_ENABLED: optional(z.enum(["true", "false"])),
});

export type Env = z.infer<typeof envSchema>;

// Exported for unit testing the schema in isolation (see tests/unit/env.test.ts) without
// re-importing this module under different process.env values.
export { envSchema };

/** Marqueur des valeurs de remplacement injectées par le Dockerfile pendant le build. */
const BUILD_PLACEHOLDER = "build-placeholder";

/**
 * Refuse de laisser démarrer l'application si une valeur de remplacement du build a survécu.
 *
 * Le Dockerfile fournit des valeurs factices aux secrets serveur pour que `next build`
 * puisse valider l'environnement sans eux (voir son étape `builder`). Si l'une d'elles est
 * encore là au démarrage réel, c'est que l'hébergeur n'a pas injecté la vraie : mieux vaut
 * refuser de démarrer que de servir l'application avec un secret que tout le monde peut lire
 * dans le dépôt.
 *
 * Exporté pour être testable isolément — c'est un garde-fou de sécurité, pas un détail.
 */
export function assertNoBuildPlaceholders(
  data: Env,
  { isBuildPhase }: { isBuildPhase: boolean },
): void {
  if (data.NODE_ENV !== "production" || isBuildPhase) return;

  const leaked = Object.entries(data)
    .filter(([, value]) => typeof value === "string" && value.includes(BUILD_PLACEHOLDER))
    .map(([key]) => key);

  if (leaked.length > 0) {
    throw new Error(
      `Variables d'environnement non fournies en production : ${leaked.join(", ")}. ` +
        "Elles portent encore la valeur de remplacement utilisée au build.",
    );
  }
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", z.treeifyError(parsed.error));
    throw new Error("Invalid environment variables. Check the errors above and your .env file.");
  }

  // NEXT_PUBLIC_UMAMI_WEBSITE_ID is optional in the schema (some projects opt out of
  // analytics entirely), but forgetting to set it on a real deployment fails silently —
  // UmamiScript just renders nothing, so stats never move and nothing looks broken. Warn
  // loudly at boot so a missing var shows up in the deploy logs instead of going unnoticed.
  if (parsed.data.NODE_ENV === "production" && !parsed.data.NEXT_PUBLIC_UMAMI_WEBSITE_ID) {
    console.warn(
      "NEXT_PUBLIC_UMAMI_WEBSITE_ID is not set: Umami analytics will not track anything on this production deployment.",
    );
  }

  assertNoBuildPlaceholders(parsed.data, {
    // `next build` s'exécute lui aussi en NODE_ENV=production, et c'est précisément le
    // moment où les valeurs de remplacement sont légitimes. Next signale cette phase par
    // NEXT_PHASE.
    isBuildPhase: process.env.NEXT_PHASE === "phase-production-build",
  });

  return parsed.data;
}

export const env = loadEnv();
