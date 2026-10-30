import { describe, expect, it } from "vitest";
import { challengeProgress, computeBadges, type ChallengeBook } from "@/lib/challenges";

function entry(overrides: Partial<ChallengeBook>): ChallengeBook {
  return {
    author: "Auteur",
    genre: null,
    pageCount: null,
    userRating: null,
    status: "FINISHED",
    userEndDate: new Date("2026-05-01"),
    ...overrides,
  };
}

const books = [
  entry({ author: "Agatha Christie", genre: "Policier", pageCount: 300 }),
  entry({ author: "agatha christie", genre: "policier", pageCount: 650 }),
  entry({ author: "Victor Hugo", genre: "Classique", pageCount: 1664 }),
  entry({ author: "Victor Hugo", genre: "Classique", userEndDate: new Date("2025-03-01") }),
];

describe("challengeProgress", () => {
  it("ne compte que les livres terminés dans l'année du défi", () => {
    expect(challengeProgress({ kind: "books", filter: null, year: 2026 }, books)).toBe(3);
    expect(challengeProgress({ kind: "pages", filter: null, year: 2026 }, books)).toBe(2614);
    expect(challengeProgress({ kind: "long_books", filter: null, year: 2026 }, books)).toBe(2);
  });

  it("compare genre et auteur sans casse ni accents", () => {
    expect(challengeProgress({ kind: "genre", filter: "POLICIER", year: 2026 }, books)).toBe(2);
    expect(challengeProgress({ kind: "author", filter: "christie", year: 2026 }, books)).toBe(2);
  });
});

describe("computeBadges", () => {
  it("calcule la progression et ajoute le badge d'objectif quand il existe", () => {
    const badges = computeBadges({ books, year: 2026, longestStreak: 8, goal: 3 });
    const byId = Object.fromEntries(badges.map((badge) => [badge.id, badge]));
    expect(byId.first.earned).toBe(true);
    expect(byId["streak-7"].earned).toBe(true);
    expect(byId["streak-30"]).toMatchObject({ earned: false, progress: 8 });
    expect(byId["long-books"]).toMatchObject({ earned: false, progress: 2 });
    expect(byId.goal).toMatchObject({ earned: true, target: 3 });
  });

  it("n'affiche pas de badge d'objectif sans objectif", () => {
    const badges = computeBadges({ books, year: 2026, longestStreak: 0, goal: null });
    expect(badges.some((badge) => badge.id === "goal")).toBe(false);
  });
});
