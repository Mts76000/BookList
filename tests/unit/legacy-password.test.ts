import { describe, expect, it } from "vitest";
import { isBcryptHash } from "@/lib/legacy-password";

describe("isBcryptHash", () => {
  it("reconnaît les variantes de préfixe bcrypt produites par bcryptjs", () => {
    for (const prefix of ["$2a$", "$2b$", "$2x$", "$2y$"]) {
      expect(isBcryptHash(`${prefix}12$abcdefghijklmnopqrstuv`)).toBe(true);
    }
  });

  it("ne prend pas un hash scrypt de better-auth pour du bcrypt", () => {
    expect(isBcryptHash("529d77df948712a74989:8f3c1e...")).toBe(false);
  });

  it("ne se laisse pas piéger par un préfixe bcrypt au milieu de la chaîne", () => {
    expect(isBcryptHash("scrypt$2a$12$notreallybcrypt")).toBe(false);
  });
});
