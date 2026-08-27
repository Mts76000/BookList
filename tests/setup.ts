import { config } from "dotenv";
config({ path: ".env.test", quiet: true });

import { assertTestDatabase } from "@/lib/db-safety";

// Runs before every test file, unit and integration alike: refuses to proceed if
// DATABASE_URL isn't clearly a test database, so a misconfigured .env.test can never let a
// test suite touch dev/prod data.
assertTestDatabase(process.env.DATABASE_URL);
