import { describe, expect, it } from "vitest";
import { cleanIsbn, sameIsbn, toIsbn10, toIsbn13 } from "@/lib/isbn";

describe("isbn", () => {
  it("nettoie tirets et espaces", () => {
    expect(cleanIsbn("978-2-07-061275-8")).toBe("9782070612758");
    expect(cleanIsbn(" 2-07-036002-x ")).toBe("207036002X");
  });

  it("convertit un ISBN-10 en ISBN-13 et inversement", () => {
    expect(toIsbn13("2070360024")).toBe("9782070360024");
    expect(toIsbn13("978-2070612758")).toBe("9782070612758");
    expect(toIsbn10("9782253006329")).toBe("2253006327");
    expect(toIsbn10("9791034755417")).toBeNull();
  });

  it("refuse ce qui n'est pas un ISBN", () => {
    expect(toIsbn13("12345")).toBeNull();
    expect(toIsbn13(null)).toBeNull();
  });

  it("reconnaît une même édition écrite en 10 ou en 13", () => {
    expect(sameIsbn("2070360024", "978-2-07-036002-4")).toBe(true);
    expect(sameIsbn("9782070360024", "9782070612758")).toBe(false);
    expect(sameIsbn(null, null)).toBe(false);
  });
});
