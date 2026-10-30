import { describe, expect, it } from "vitest";
import { authorFromCreator, pagesFromFormat, validPageCount } from "@/lib/book-sources";

describe("notices BnF", () => {
  it("lit le nombre de pages de la description matérielle", () => {
    expect(pagesFromFormat("1 vol. (113 p.) : ill., couv. ill. en coul. ; 18 cm")).toBe(113);
    expect(pagesFromFormat("616 p. : Ill., couv. ill. ; 17 cm")).toBe(616);
    expect(pagesFromFormat("1 volume 191 p ; 18 cm")).toBe(191);
    expect(pagesFromFormat("1 vol. ; 18 cm")).toBeNull();
  });

  it("remet l'auteur dans l'ordre et ignore les autres rôles", () => {
    expect(authorFromCreator("Saint-Exupéry, Antoine de (1900-1944). Auteur du texte")).toBe(
      "Antoine de Saint-Exupéry",
    );
    expect(authorFromCreator("Sola, Jean (1938-2014). Traducteur")).toBeNull();
  });

  it("écarte un nombre de pages nul ou absurde", () => {
    expect(validPageCount(0)).toBeNull();
    expect(validPageCount(null)).toBeNull();
    expect(validPageCount(352)).toBe(352);
  });
});
