import { describe, expect, it, vi, beforeEach } from "vitest";

const getSession = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

// redirect() de Next interrompt le rendu en levant : on reproduit ce comportement pour
// pouvoir vérifier vers où requireAuthPage() renvoie.
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

const {
  requireAuth,
  requireAuthPage,
  requireRole,
  getOptionalSession,
  UnauthorizedError,
  ForbiddenError,
} = await import("@/lib/permissions");

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

describe("requireAuthPage", () => {
  beforeEach(() => {
    getSession.mockReset();
    redirect.mockClear();
  });

  it("returns the session when one exists, without redirecting", async () => {
    const session = { user: { id: "1", role: "user" } };
    getSession.mockResolvedValue(session);
    await expect(requireAuthPage()).resolves.toBe(session);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to the login page when there is no session", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireAuthPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("carries the requested path so the visitor lands back on it after logging in", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireAuthPage("/books/42")).rejects.toThrow(
      "NEXT_REDIRECT:/login?redirectTo=%2Fbooks%2F42",
    );
  });

  it("lets an unexpected error through instead of redirecting", async () => {
    getSession.mockRejectedValue(new Error("database is down"));
    await expect(requireAuthPage()).rejects.toThrow("database is down");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("getOptionalSession", () => {
  beforeEach(() => getSession.mockReset());

  it("returns the session when one exists", async () => {
    const session = { user: { id: "1", role: "user" } };
    getSession.mockResolvedValue(session);
    await expect(getOptionalSession()).resolves.toBe(session);
  });

  it("returns null instead of throwing when there is none", async () => {
    getSession.mockResolvedValue(null);
    await expect(getOptionalSession()).resolves.toBeNull();
  });
});
