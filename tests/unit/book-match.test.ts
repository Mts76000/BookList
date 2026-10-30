import { describe, expect, it } from "vitest";
import { findOwnedBook, type OwnedBook } from "@/lib/book-match";

function owned(overrides: Partial<OwnedBook>): OwnedBook {
  return {
    id: "b1",
    isbn: null,
    title: "Le Petit Prince",
    author: "Antoine de Saint-Exupéry",
    coverUrl: null,
    pageCount: null,
    ...overrides,
  };
}

describe("findOwnedBook", () => {
  it("retrouve par ISBN, même écrit en ISBN-10", () => {
    const library = [owned({ isbn: "2070360024", title: "L'Étranger", author: "Albert Camus" })];
    const match = findOwnedBook(
      { title: "L’étranger", authors: ["Albert Camus"], isbn: "9782070360024" },
      library,
    );
    expect(match?.by).toBe("isbn");
  });

  it("retrouve par titre et auteur un livre ajouté par son nom", () => {
    const library = [owned({ isbn: "9789001708528" })];
    const match = findOwnedBook(
      { title: "Le petit prince", authors: ["Antoine de Saint-Exupery"], isbn: "9782070612758" },
      library,
    );
    expect(match).toEqual({ book: library[0], by: "title" });
  });

  it("tient compte du sous-titre", () => {
    const library = [
      owned({ title: "Le Trône de fer : L'intégrale 1", author: "George R. R. Martin" }),
    ];
    const match = findOwnedBook(
      {
        title: "Le Trône de fer",
        subtitle: "L'intégrale 1",
        authors: ["George R.R. Martin"],
        isbn: null,
      },
      library,
    );
    expect(match?.by).toBe("title");
  });

  it("distingue deux tomes et deux auteurs", () => {
    const library = [owned({ title: "Dune - Tome 1", author: "Frank Herbert" })];
    expect(
      findOwnedBook({ title: "Dune - Tome 2", authors: ["Frank Herbert"], isbn: null }, library),
    ).toBeNull();
    expect(
      findOwnedBook({ title: "Le Petit Prince", authors: ["Autre Personne"], isbn: null }, [
        owned({}),
      ]),
    ).toBeNull();
  });
});
