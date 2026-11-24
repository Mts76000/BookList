import { describe, expect, it, vi } from "vitest";

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }));

vi.mock("@/lib/env", () => ({
  env: { DATABASE_URL: "postgres://user:pass@localhost:5433/db_test" },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn },
}));

// Creating a pg Pool opens no connection until the first query, so no real database is
// needed here.
const { pool } = await import("@/lib/db");

describe("db pool", () => {
  it("does not throw when an idle client emits an error, and logs it", () => {
    const err = new Error("terminating connection due to administrator command");

    expect(() => pool.emit("error", err)).not.toThrow();
    expect(warn).toHaveBeenCalledWith({ err }, "idle pg client error");
  });
});
