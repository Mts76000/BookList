import { config } from "dotenv";
config({ path: ".env.test", quiet: true });

import { assertTestDatabase } from "@/lib/db-safety";

// Runs before every test file, unit and integration alike: refuses to proceed if
// DATABASE_URL isn't clearly a test database, so a misconfigured .env.test can never let a
// test suite touch dev/prod data.
assertTestDatabase(process.env.DATABASE_URL);

// Note : les fichiers de tests/integration/ partagent une seule base et se nettoient par
// TRUNCATE entre les cas. Ils doivent donc s'exécuter en série — d'où le
// `--no-file-parallelism` du script `test:integration`. Lancés en parallèle, ils tronquent
// les données les uns des autres et se battent pour créer le schéma des migrations.
