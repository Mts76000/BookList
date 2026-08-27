import { defineConfig, configDefaults } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Vitest's default include glob also matches tests/e2e/*.spec.ts, which Playwright
    // Test owns exclusively (test.describe() throws when imported outside its own runner).
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Scoped to the files unit tests actually exercise (tests/unit/*). Auth, email, db,
      // and route-handler files are covered by the integration/e2e suites instead — folding
      // them into this threshold would fail it regardless of how well those files are
      // tested, since this command never runs them.
      include: [
        "lib/api-response.ts",
        "lib/env.ts",
        "lib/validation.ts",
        "lib/pagination.ts",
        "lib/rate-limit.ts",
        "lib/permissions.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
