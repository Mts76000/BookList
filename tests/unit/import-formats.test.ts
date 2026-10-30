import { describe, expect, it } from "vitest";
import { detectImportFormat, toBookListRow } from "@/lib/import-formats";

const GOODREADS_HEADER =
  "Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Owned Copies".split(
    ",",
  );

const STORYGRAPH_HEADER =
  "Title,Authors,Contributors,ISBN/UID,Format,Read Status,Date Added,Last Date Read,Dates Read,Read Count,Moods,Pace,Star Rating,Review,Tags,Owned?".split(
    ",",
  );

describe("detectImportFormat", () => {
  it("reconnaît les exports Goodreads et StoryGraph à leur en-tête", () => {
    expect(detectImportFormat(GOODREADS_HEADER)).toBe("goodreads");
    expect(detectImportFormat(STORYGRAPH_HEADER)).toBe("storygraph");
    expect(detectImportFormat(["title", "author", "isbn"])).toBe("booklist");
  });
});

describe("toBookListRow — Goodreads", () => {
  it("convertit une ligne lue, notée et datée", () => {
    const row = toBookListRow("goodreads", {
      Title: "Dune (Dune, #1)",
      Author: "Frank Herbert",
      ISBN: '="2266320483"',
      ISBN13: '="9782266320481"',
      "My Rating": "5",
      "Number of Pages": "890",
      "Year Published": "2021",
      "Original Publication Year": "1965",
      "Date Read": "2024/3/7",
      "Exclusive Shelf": "read",
      Binding: "Mass Market Paperback",
      Bookshelves: "favoris, read, prêtés",
    });

    expect(row).toEqual({
      title: "Dune",
      seriesName: "Dune",
      seriesIndex: "1",
      author: "Frank Herbert",
      isbn: "9782266320481",
      pageCount: "890",
      publishedDate: "1965",
      userRating: "5",
      userEndDate: "2024-03-07",
      status: "FINISHED",
      format: "paper",
      tags: "favoris, prêtés",
    });
  });

  it("traite une note de 0 comme absente et une pile à lire comme TO_READ", () => {
    const row = toBookListRow("goodreads", {
      Title: "Le Rouge et le Noir",
      Author: "Stendhal",
      ISBN: '=""',
      ISBN13: '=""',
      "My Rating": "0",
      "Exclusive Shelf": "to-read",
    });
    expect(row.userRating).toBe("");
    expect(row.isbn).toBe("");
    expect(row.status).toBe("TO_READ");
  });

  it("classe une étagère personnalisée d'après la date de fin", () => {
    expect(
      toBookListRow("goodreads", { "Exclusive Shelf": "abandoned", "Date Read": "" }).status,
    ).toBe("TO_READ");
    expect(
      toBookListRow("goodreads", { "Exclusive Shelf": "favorites", "Date Read": "2023/01/02" })
        .status,
    ).toBe("FINISHED");
  });
});

describe("toBookListRow — StoryGraph", () => {
  it("arrondit les quarts d'étoile et reprend les dates de lecture", () => {
    const row = toBookListRow("storygraph", {
      Title: "Klara et le Soleil",
      Authors: "Kazuo Ishiguro",
      "ISBN/UID": "9782070149254",
      "Read Status": "read",
      "Star Rating": "4.25",
      "Last Date Read": "2023/05/14",
      "Dates Read": "2023/04/01-2023/05/14",
    });
    expect(row).toMatchObject({
      isbn: "9782070149254",
      userRating: "4",
      userStartDate: "2023-04-01",
      userEndDate: "2023-05-14",
      status: "FINISHED",
    });
  });

  it("ignore un identifiant interne qui n'est pas un ISBN et classe un abandon à part", () => {
    const row = toBookListRow("storygraph", {
      Title: "Ulysse",
      Authors: "James Joyce",
      "ISBN/UID": "b6f9d2c1-7e0a",
      "Read Status": "did-not-finish",
      "Last Date Read": "2023/01/10",
    });
    expect(row.isbn).toBe("");
    expect(row.status).toBe("ABANDONED");
  });

  it("reprend le format et les tags", () => {
    const row = toBookListRow("storygraph", {
      Title: "Dune",
      Authors: "Frank Herbert",
      "Read Status": "to-read",
      Format: "audio",
      Tags: "sf, culte",
    });
    expect(row).toMatchObject({ format: "audio", tags: "sf, culte" });
  });
});
