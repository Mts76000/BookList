import { describe, expect, it } from "vitest";
import { bestIsbn, isbnAffinity, pickEdition, titleMatches } from "@/lib/edition-match";

// Harry Potter chez Gallimard : grand format (97820705…) et Folio Junior (97820705846…).
const FOLIO_JUNIOR_T1 = "9782070584628";
const FOLIO_JUNIOR_T3 = "9782070584925";
const GRAND_FORMAT_T3 = "9782070541300";
const ENGLISH_T3 = "9780747545927";

describe("isbnAffinity", () => {
  it("rapproche les ISBN d'une même collection", () => {
    expect(isbnAffinity(FOLIO_JUNIOR_T3, [FOLIO_JUNIOR_T1])).toBeGreaterThan(
      isbnAffinity(GRAND_FORMAT_T3, [FOLIO_JUNIOR_T1]),
    );
    expect(isbnAffinity(GRAND_FORMAT_T3, [FOLIO_JUNIOR_T1])).toBeGreaterThan(
      isbnAffinity(ENGLISH_T3, [FOLIO_JUNIOR_T1]),
    );
  });

  it("préfère une édition française sans tome de référence", () => {
    expect(isbnAffinity(GRAND_FORMAT_T3, [])).toBeGreaterThan(isbnAffinity(ENGLISH_T3, []));
  });

  it("ignore les ISBN-10 et les valeurs absentes", () => {
    expect(isbnAffinity("2070619192", [FOLIO_JUNIOR_T1])).toBe(0);
    expect(isbnAffinity(null, [FOLIO_JUNIOR_T1])).toBe(0);
  });
});

describe("bestIsbn", () => {
  it("choisit l'édition de la même collection parmi celles d'une œuvre", () => {
    expect(
      bestIsbn([ENGLISH_T3, GRAND_FORMAT_T3, FOLIO_JUNIOR_T3, "2070619192"], [FOLIO_JUNIOR_T1]),
    ).toBe(FOLIO_JUNIOR_T3);
  });
});

describe("pickEdition", () => {
  const candidates = [
    { title: "Harry Potter and the Prisoner of Azkaban", isbn: ENGLISH_T3, coverUrl: "en" },
    { title: "Harry Potter et le prisonnier d'Azkaban", isbn: GRAND_FORMAT_T3, coverUrl: "gf" },
    { title: "Harry Potter et le prisonnier d'Azkaban", isbn: FOLIO_JUNIOR_T3, coverUrl: "fj" },
    { title: "Harry Potter et la Coupe de feu", isbn: "9782070584932", coverUrl: "t4" },
  ];

  it("garde le bon titre, dans la collection des tomes possédés", () => {
    expect(
      pickEdition(candidates, "Harry Potter et le Prisonnier d'Azkaban", [FOLIO_JUNIOR_T1])
        ?.coverUrl,
    ).toBe("fj");
  });

  it("ne retient rien quand aucun titre ne correspond", () => {
    expect(pickEdition(candidates, "Les Animaux fantastiques", [])).toBeNull();
  });
});

describe("titleMatches", () => {
  it("accepte une tomaison ou un sous-titre en plus", () => {
    expect(
      titleMatches("Harry Potter, Tome 3 : Le prisonnier d'Azkaban", "Le Prisonnier d'Azkaban"),
    ).toBe(true);
    expect(titleMatches("Dune", "Le Messie de Dune")).toBe(false);
    expect(titleMatches("Harry Potter", "Harry Potter et le prisonnier d'Azkaban")).toBe(false);
  });
});
