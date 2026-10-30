import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { user } from "@/drizzle/schema/auth";

/**
 * Abonnement Web Push d'un appareil, pour les rappels de lecture. Un utilisateur peut en
 * avoir plusieurs (téléphone, ordinateur) ; sa présence vaut consentement aux rappels.
 * Table technique : suppression physique, au désabonnement, quand le navigateur signale
 * l'abonnement expiré, ou en cascade depuis l'utilisateur.
 */
export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("push_subscription_userId_idx").on(table.userId)],
);
