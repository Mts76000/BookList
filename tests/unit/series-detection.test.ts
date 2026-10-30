import { describe, expect, it } from "vitest";
import {
  seriesForNewBook,
  seriesFromTitle,
  suggestSeries,
  type LibraryBook,
  cleanTitleVariants,
  matchKnownSeries,
  sameAuthors,
  seriesLookupTitles,
} from "@/lib/series-detection";

describe("seriesFromTitle", () => {
  it("reconnaît les marqueurs de tome courants", () => {
    expect(seriesFromTitle("La Passe-miroir, tome 2 : Les Disparus du Clairdelune")).toEqual({
      seriesName: "La Passe-miroir",
      seriesIndex: 2,
    });
    expect(seriesFromTitle("Harry Potter - Tome 3")).toEqual({
      seriesName: "Harry Potter",
      seriesIndex: 3,
    });
    expect(seriesFromTitle("Astérix T12")).toEqual({ seriesName: "Astérix", seriesIndex: 12 });
    expect(seriesFromTitle("Les Rois maudits, vol. 4")).toEqual({
      seriesName: "Les Rois maudits",
      seriesIndex: 4,
    });
    expect(seriesFromTitle("La Tour sombre, livre VI")).toEqual({
      seriesName: "La Tour sombre",
      seriesIndex: 6,
    });
  });

  it("préfère le sous-titre, qui porte souvent la saga chez Google", () => {
    expect(seriesFromTitle("Le Messie de Dune", "Le cycle de Dune, tome 2")).toEqual({
      seriesName: "Le cycle de Dune",
      seriesIndex: 2,
    });
  });

  it("garde le format Goodreads", () => {
    expect(seriesFromTitle("Dune (Dune, #1)")).toEqual({ seriesName: "Dune", seriesIndex: 1 });
  });

  it("ne voit pas de saga dans un titre ordinaire", () => {
    expect(seriesFromTitle("L'Étranger")).toBeNull();
    expect(seriesFromTitle("Le Livre des étoiles")).toBeNull();
    expect(seriesFromTitle("Tome 1")).toBeNull();
  });
});

function book(
  id: string,
  title: string,
  author: string,
  extra: Partial<LibraryBook> = {},
): LibraryBook {
  return { id, title, author, seriesName: null, seriesIndex: null, publishedDate: null, ...extra };
}

describe("suggestSeries", () => {
  it("regroupe les livres d'un auteur qui partagent un mot porteur, par ordre de parution", () => {
    const suggestions = suggestSeries([
      book("b", "Fondation et Empire", "Isaac Asimov", { publishedDate: "1952" }),
      book("a", "Fondation", "Isaac Asimov", { publishedDate: "1951" }),
      book("c", "Seconde Fondation", "Isaac Asimov", { publishedDate: "1953" }),
      book("d", "Les Robots", "Isaac Asimov"),
    ]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ name: "Fondation", existing: false, reason: "author" });
    expect(suggestions[0].books).toEqual([
      { id: "a", seriesIndex: 1 },
      { id: "b", seriesIndex: 2 },
      { id: "c", seriesIndex: 3 },
    ]);
  });

  it("propose d'ajouter un livre à une saga existante du même auteur, au tome manquant", () => {
    const suggestions = suggestSeries([
      book("a", "Dune", "Frank Herbert", { seriesName: "Dune", seriesIndex: 1 }),
      book("c", "Les Enfants de Dune", "Frank Herbert", { seriesName: "Dune", seriesIndex: 3 }),
      book("b", "Le Messie de Dune", "Frank Herbert"),
    ]);
    expect(suggestions).toEqual([
      expect.objectContaining({
        name: "Dune",
        existing: true,
        books: [{ id: "b", seriesIndex: 2 }],
      }),
    ]);
  });

  it("rattache un tome annoncé dans le titre à la saga existante, sans tenir compte de la casse", () => {
    const suggestions = suggestSeries([
      book("a", "x", "Christelle Dabos", { seriesName: "La Passe-miroir", seriesIndex: 1 }),
      book("b", "La passe-miroir, tome 2", "Christelle Dabos"),
    ]);
    expect(suggestions[0]).toMatchObject({
      name: "La Passe-miroir",
      existing: true,
      reason: "title",
      books: [{ id: "b", seriesIndex: 2 }],
    });
  });

  it("ne rapproche pas des livres d'auteurs différents ni sans mot commun", () => {
    expect(
      suggestSeries([
        book("a", "Mort sur le Nil", "Agatha Christie"),
        book("b", "Le Crime de l'Orient-Express", "Agatha Christie"),
        book("c", "Fondation", "Isaac Asimov"),
        book("d", "Fondation", "Autre Auteur"),
      ]),
    ).toEqual([]);
  });

  it("nomme la saga d'après tous les mots communs aux titres", () => {
    const suggestions = suggestSeries([
      book("a", "Harry Potter à l'école des sorciers", "J. K. Rowling"),
      book("b", "Harry Potter et la Chambre des secrets", "J.K. Rowling"),
    ]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].name).toBe("Harry Potter");
  });

  it("donne une clé stable, indépendante de l'ordre des livres", () => {
    const books = [
      book("a", "Hypérion", "Dan Simmons"),
      book("b", "La Chute d'Hypérion", "Dan Simmons"),
    ];
    expect(suggestSeries(books)[0].key).toBe(suggestSeries([...books].reverse())[0].key);
  });
});

describe("seriesForNewBook", () => {
  const known = [
    { name: "Dune", nextIndex: 4, total: 6, authors: ["Frank Herbert"] },
    { name: "La Passe-miroir", nextIndex: 3, total: 4, authors: ["Christelle Dabos"] },
  ];

  it("rattache le tome annoncé par le sous-titre à la saga existante du même auteur", () => {
    expect(
      seriesForNewBook("Le Messie de Dune", "Le cycle de Dune, tome 2", "Frank Herbert", known),
    ).toEqual({ seriesName: "Dune", seriesIndex: 2, seriesTotal: 6, existing: true });
  });

  it("propose le tome suivant quand le titre reprend le nom d'une saga du même auteur", () => {
    expect(seriesForNewBook("La Maison des mères", null, "Frank Herbert", known)).toBeNull();
    expect(seriesForNewBook("Les Hérétiques de Dune", null, "Frank Herbert", known)).toEqual({
      seriesName: "Dune",
      seriesIndex: 4,
      seriesTotal: 6,
      existing: true,
    });
  });

  it("propose une nouvelle saga quand le titre en annonce une inconnue", () => {
    expect(seriesForNewBook("Harry Potter, tome 1", null, "J. K. Rowling", known)).toEqual({
      seriesName: "Harry Potter",
      seriesIndex: 1,
      seriesTotal: null,
      existing: false,
    });
  });

  it("ne rattache pas un livre d'un autre auteur sur un simple mot commun", () => {
    expect(seriesForNewBook("Dune et désert", null, "Autre Auteur", known)).toBeNull();
  });
});

describe("détection des sagas à l'ajout", () => {
  const known = [
    { name: "Le cycle de Dune", nextIndex: 3, total: 6, authors: ["Frank Herbert"] },
    { name: "Harry Potter", nextIndex: 2, total: 7, authors: ["J.K. Rowling"] },
  ];

  it("nettoie les titres d'édition de leur tomaison", () => {
    expect(cleanTitleVariants("tome 1, Harry Potter")).toEqual(["Harry Potter"]);
    expect(cleanTitleVariants("Hunger Games - tome 1")).toEqual(["Hunger Games"]);
    expect(cleanTitleVariants("Divergente 1 - Divergente")).toEqual(["Divergente"]);
  });

  it("cherche d'abord le titre du tome, puis le titre complet", () => {
    expect(seriesLookupTitles("Dune - Tome 2 Le Messie de Dune")[0]).toBe("Le Messie de Dune");
  });

  it("reconnaît un même auteur écrit autrement ou avec son traducteur", () => {
    expect(sameAuthors("J. K. Rowling", "J.K. Rowling")).toBe(true);
    expect(sameAuthors(["Frank Herbert"], "Frank Herbert, Michel Demuth")).toBe(true);
    expect(sameAuthors("Frank Herbert", "Isaac Asimov")).toBe(false);
  });

  it("range dans la saga existante même nommée autrement", () => {
    expect(matchKnownSeries("Dune", "Frank Herbert, Michel Demuth", known)?.name).toBe(
      "Le cycle de Dune",
    );
    expect(matchKnownSeries("harry potter", "Autre", known)?.name).toBe("Harry Potter");
    expect(matchKnownSeries("Fondation", "Isaac Asimov", known)).toBeNull();
  });

  it("lit la tomaison d'une notice de bibliothèque", () => {
    expect(seriesFromTitle("Le cycle de Dune. 3, Le messie de Dune")).toEqual({
      seriesName: "Le cycle de Dune",
      seriesIndex: 3,
    });
  });
});
