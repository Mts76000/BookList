import { pgTable, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { user } from "@/drizzle/schema/auth";

// Technical/system table: hard delete only, no deletedAt (see CLAUDE.md soft vs hard delete rule).
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
