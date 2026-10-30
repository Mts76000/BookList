import { describe, expect, it } from "vitest";
import { recommendNext, type RecommendableBook } from "@/lib/recommendations";

let counter = 0;
function entry(overrides: Partial<RecommendableBook>): RecommendableBook {
  counter += 1;
  return {
    id: `b${counter}`,
    title: `Livre ${counter}`,
    author: "Auteur",
    coverUrl: null,
    genre: null,
    status: "TO_READ",
    userRating: null,
    seriesName: null,
    seriesIndex: null,
    ...overrides,
  };
}

describe("recommendNext", () => {
  it("met en tête la suite d'une saga dont le tome précédent est terminé", () => {
    const books = [
      entry({ status: "FINISHED", seriesName: "Dune", seriesIndex: 1, userRating: 4 }),
      entry({ title: "Le Messie de Dune", seriesName: "Dune", seriesIndex: 2 }),
      entry({ title: "Sans lien", genre: "Poésie" }),
    ];
    const [first] = recommendNext(books);
    expect(first.book.title).toBe("Le Messie de Dune");
    expect(first.reason).toContain("tome 1");
  });

  it("favorise les auteurs et genres bien notés", () => {
    const books = [
      entry({ status: "FINISHED", author: "Camus", userRating: 5, genre: "Roman" }),
      entry({ status: "FINISHED", author: "Zola", userRating: 2, genre: "Classique" }),
      entry({ title: "La Chute", author: "Camus" }),
      entry({ title: "Nana", author: "Zola", genre: "Classique" }),
    ];
    const titles = recommendNext(books).map((r) => r.book.title);
    expect(titles).toEqual(["La Chute"]);
  });

  it("ne recommande rien sans signal", () => {
    expect(recommendNext([entry({}), entry({})])).toEqual([]);
  });
});
