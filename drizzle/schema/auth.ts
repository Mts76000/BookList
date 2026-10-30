import { pgTable, text, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";

// Schema shape follows better-auth's expected Drizzle adapter tables, cross-checked against
// `npx @better-auth/cli generate` output for this project's better-auth version.
// See: https://www.better-auth.com/docs/adapters/drizzle

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"), // "user" | "admin"
  // Champs métier BookList, exposés à better-auth via `user.additionalFields` (lib/auth.ts).
  // Nombre de livres lus avant l'inscription, saisi à l'onboarding : il s'ajoute aux
  // statistiques sans qu'on ait à créer autant de lignes `book` fictives.
  initialBooksRead: integer("initial_books_read").notNull().default(0),
  hasSeenOnboarding: boolean("has_seen_onboarding").notNull().default(false),
  // Suppression de compte par anonymisation et non par suppression physique — dérogation
  // assumée au socle, documentée dans AGENTS.md. La ligne survit, vidée de toute donnée
  // personnelle, pour que les comptes déjà supprimés en v1 restent migrables tels quels.
  isAnonymized: boolean("is_anonymized").notNull().default(false),
  anonymizedAt: timestamp("anonymized_at"),
  // Abonnement Premium (Stripe). `premiumUntil` est la seule source de vérité de l'accès :
  // fin de la période payée, prolongée à chaque renouvellement par le webhook. Un abonnement
  // résilié garde donc ses avantages jusqu'au terme déjà réglé, sans état à part à gérer.
  premiumUntil: timestamp("premium_until"),
  // Premium offert par un administrateur, indépendant de Stripe : un abonnement payant ne
  // l'écrase pas, et il n'est jamais facturé. L'accès Premium vaut la plus tardive des deux
  // dates.
  premiumGrantedUntil: timestamp("premium_granted_until"),
  // Formule de l'abonnement Stripe ("monthly" ou "yearly"), pour le revenu estimé de l'admin.
  subscriptionInterval: text("subscription_interval"),
  // Essai gratuit de Premium, sans carte : une seule fois par compte. Pendant l'essai,
  // `premiumUntil` vaut sa date de fin.
  trialStartedAt: timestamp("trial_started_at"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // Statut Stripe brut (active, past_due, canceled...), affiché sur la page du compte.
  subscriptionStatus: text("subscription_status"),
  // L'abonné a demandé la résiliation : l'accès court jusqu'à `premiumUntil`, sans
  // renouvellement.
  subscriptionCancelAtPeriodEnd: boolean("subscription_cancel_at_period_end")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    // Scopes account identity per better-auth 1.7+ (see the "account identity is scoped by
    // issuer" upgrade guide) — required by the drizzle adapter.
    issuer: text("issuer"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);
