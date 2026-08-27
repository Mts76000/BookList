import { describe, expect, it } from "vitest";
import { countGenres, parseGenres, topGenres, uniqueGenres } from "@/lib/genres";

describe("parseGenres", () => {
  it("splits, trims and drops empty entries", () => {
    expect(parseGenres("Roman, Philosophie ,, SF")).toEqual(["Roman", "Philosophie", "SF"]);
  });

  it("returns an empty array for null/undefined/empty input", () => {
    expect(parseGenres(null)).toEqual([]);
    expect(parseGenres(undefined)).toEqual([]);
    expect(parseGenres("")).toEqual([]);
  });
});

describe("countGenres", () => {
  it("counts occurrences across books, including comma-separated genres", () => {
    const counts = countGenres([
      { genre: "Roman, Philosophie" },
      { genre: "Roman" },
      { genre: null },
    ]);
    expect(counts.get("Roman")).toBe(2);
    expect(counts.get("Philosophie")).toBe(1);
  });
});

describe("topGenres", () => {
  it("returns the most frequent genres, limited and sorted by count", () => {
    const books = [{ genre: "SF" }, { genre: "SF" }, { genre: "Roman" }, { genre: "Fantasy" }];
    expect(topGenres(books, 2)).toEqual(["SF", "Roman"]);
  });
});

describe("uniqueGenres", () => {
  it("returns a sorted, deduplicated list of genres", () => {
    expect(uniqueGenres([{ genre: "SF, Roman" }, { genre: "Roman" }, { genre: null }])).toEqual([
      "Roman",
      "SF",
    ]);
  });
});
