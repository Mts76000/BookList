import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env.local file).");
}

export default defineConfig({
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
});
