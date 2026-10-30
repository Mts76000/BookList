import { describe, expect, it } from "vitest";
import { isPremiumActive } from "@/lib/plans";

describe("isPremiumActive", () => {
  it("est vrai tant que la période payée court", () => {
    expect(isPremiumActive(new Date(Date.now() + 60_000))).toBe(true);
    expect(isPremiumActive(new Date(Date.now() + 60_000).toISOString())).toBe(true);
  });

  it("est faux sans abonnement ou une fois la période échue", () => {
    expect(isPremiumActive(null)).toBe(false);
    expect(isPremiumActive(undefined)).toBe(false);
    expect(isPremiumActive(new Date(Date.now() - 60_000))).toBe(false);
  });
});
