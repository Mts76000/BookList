import { describe, expect, it } from "vitest";
import { parseCsv, csvRowsToObjects } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    const rows = parseCsv("title,author\nDune,Frank Herbert");
    expect(rows).toEqual([
      ["title", "author"],
      ["Dune", "Frank Herbert"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    const rows = parseCsv('title,author\n"Le Seigneur, des anneaux",Tolkien');
    expect(rows).toEqual([
      ["title", "author"],
      ["Le Seigneur, des anneaux", "Tolkien"],
    ]);
  });

  it("handles escaped quotes", () => {
    const rows = parseCsv('title,note\n"He said ""hi""",ok');
    expect(rows[1][0]).toBe('He said "hi"');
  });

  it("skips blank lines", () => {
    const rows = parseCsv("title,author\nDune,Frank Herbert\n\n");
    expect(rows).toHaveLength(2);
  });
});

describe("csvRowsToObjects", () => {
  it("maps rows to objects using the header", () => {
    const rows = [
      ["title", "author"],
      ["Dune", "Frank Herbert"],
    ];
    expect(csvRowsToObjects(rows)).toEqual([{ title: "Dune", author: "Frank Herbert" }]);
  });

  it("returns an empty array for empty input", () => {
    expect(csvRowsToObjects([])).toEqual([]);
  });
});
