import { describe, expect, it } from "vitest";
import { summarizeYear, type ReviewBook } from "@/lib/year-review";

function entry(overrides: Partial<ReviewBook>): ReviewBook {
  return {
    id: crypto.randomUUID(),
    title: "Livre",
    author: "Auteur",
    coverUrl: null,
    pageCount: null,
    genre: null,
    userRating: null,
    userEndDate: null,
    status: "FINISHED",
    ...overrides,
  };
}

describe("summarizeYear", () => {
  const books = [
    entry({
      title: "Dune",
      author: "Frank Herbert",
      pageCount: 890,
      genre: "Science-fiction",
      userRating: 5,
      userEndDate: new Date("2026-03-10"),
    }),
    entry({
      title: "Le Messie de Dune",
      author: "Frank Herbert",
      pageCount: 320,
      genre: "Science-fiction",
      userRating: 4,
      userEndDate: new Date("2026-03-25"),
    }),
    entry({
      title: "Bel-Ami",
      author: "Maupassant",
      pageCount: 400,
      genre: "Classique",
      userRating: 5,
      userEndDate: new Date("2026-07-02"),
    }),
    // Autre année : ignoré.
    entry({ title: "Germinal", pageCount: 600, userEndDate: new Date("2025-12-30") }),
    // Pas terminé : ignoré.
    entry({ title: "Ulysse", pageCount: 1000 }),
  ];

  it("ne retient que les livres terminés dans l'année", () => {
    const review = summarizeYear(books, 2026, 12);
    expect(review.booksCount).toBe(3);
    expect(review.pagesCount).toBe(1610);
    expect(review.goal).toBe(12);
  });

  it("dégage les faits marquants de l'année", () => {
    const review = summarizeYear(books, 2026, null);
    expect(review.topGenre).toBe("Science-fiction");
    expect(review.topAuthor).toEqual({ name: "Frank Herbert", count: 2 });
    expect(review.busiestMonth).toEqual({ name: "mars", count: 2 });
    expect(review.longestBook?.title).toBe("Dune");
    expect(review.averageRating).toBe(4.7);
  });

  it("départage le coup de cœur par la date de fin la plus récente", () => {
    expect(summarizeYear(books, 2026, null).favoriteBook?.title).toBe("Bel-Ami");
  });

  it("n'invente pas de faits sur une année creuse", () => {
    const review = summarizeYear([books[2]], 2026, null);
    expect(review.topAuthor).toBeNull();
    expect(review.busiestMonth).toBeNull();
    expect(summarizeYear([], 2026, null).favoriteBook).toBeNull();
  });

  it("préfère le coup de cœur choisi, même non noté", () => {
    const germinal = entry({ title: "Germinal", userEndDate: new Date("2026-05-01") });
    const review = summarizeYear([...books, germinal], 2026, null, germinal.id);
    expect(review.favoriteBook?.title).toBe("Germinal");
    expect(review.favoriteChosen).toBe(true);
  });

  it("ignore un choix qui n'est plus une lecture de l'année", () => {
    const review = summarizeYear(books, 2026, null, books[3].id);
    expect(review.favoriteBook?.title).toBe("Bel-Ami");
    expect(review.favoriteChosen).toBe(false);
  });

  it("liste les candidats du plus récent au plus ancien", () => {
    const titles = summarizeYear(books, 2026, null).finishedBooks.map((b) => b.title);
    expect(titles).toEqual(["Bel-Ami", "Le Messie de Dune", "Dune"]);
  });
});
