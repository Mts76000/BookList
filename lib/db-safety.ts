/**
 * Guard against accidentally running destructive test code against a real database.
 * Required by the test runner before any test touches the database — never bypass it.
 */
export function assertTestDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.test.example to .env.test first.");
  }

  if (!databaseUrl.includes("test")) {
    throw new Error(
      `Refusing to run: DATABASE_URL does not look like a test database (${databaseUrl}). ` +
        'Test scripts require a DATABASE_URL containing "test" — see .env.test.example.',
    );
  }
}
