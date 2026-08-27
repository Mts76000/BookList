import { describe, expect, it, vi, beforeEach } from "vitest";

const getSession = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

const { requireAuth, requireRole, UnauthorizedError, ForbiddenError } =
  await import("@/lib/permissions");

describe("requireAuth", () => {
  beforeEach(() => getSession.mockReset());

  it("returns the session when one exists", async () => {
    const session = { user: { id: "1", role: "user" } };
    getSession.mockResolvedValue(session);
    await expect(requireAuth()).resolves.toBe(session);
  });

  it("throws UnauthorizedError when there is no session", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireAuth()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("requireRole", () => {
  beforeEach(() => getSession.mockReset());

  it("returns the session when the role matches", async () => {
    const session = { user: { id: "1", role: "admin" } };
    getSession.mockResolvedValue(session);
    await expect(requireRole("admin")).resolves.toBe(session);
  });

  it("throws ForbiddenError when the role does not match", async () => {
    getSession.mockResolvedValue({ user: { id: "1", role: "user" } });
    await expect(requireRole("admin")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws UnauthorizedError before checking role when unauthenticated", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireRole("admin")).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
