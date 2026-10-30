import { describe, expect, it } from "vitest";
import { groupSeries, parseSeriesFromTitle, type SeriesBook } from "@/lib/series";

describe("parseSeriesFromTitle", () => {
  it("extrait la saga d'un titre Goodreads", () => {
    expect(parseSeriesFromTitle("Le Fléau (La Tour sombre, #4)")).toEqual({
      title: "Le Fléau",
      seriesName: "La Tour sombre",
      seriesIndex: 4,
    });
  });

  it("garde le nom mais pas un numéro décimal de hors-série", () => {
    expect(parseSeriesFromTitle("Nouvelle (Discworld, #2.5)")?.seriesIndex).toBeNull();
  });

  it("ignore un titre sans saga", () => {
    expect(parseSeriesFromTitle("L'Étranger")).toBeNull();
    expect(parseSeriesFromTitle("Mémoires (tome 2)")).toBeNull();
  });
});

describe("groupSeries", () => {
  function volume(index: number, status: SeriesBook["status"], total: number | null = null) {
    return {
      id: `v${index}`,
      title: `Tome ${index}`,
      coverUrl: null,
      status,
      seriesName: index === 2 ? "dune" : "Dune",
      seriesIndex: index,
      seriesTotal: total,
    } satisfies SeriesBook;
  }

  it("regroupe sans casse et indique le premier tome non lu", () => {
    const [series] = groupSeries([volume(2, "TO_READ"), volume(1, "FINISHED", 6)]);
    expect(series.books.map((b) => b.seriesIndex)).toEqual([1, 2]);
    expect(series).toMatchObject({ total: 6, finished: 1, next: { index: 2 } });
  });

  it("annonce un tome manquant quand tout est lu", () => {
    const [series] = groupSeries([volume(1, "FINISHED", 3), volume(2, "FINISHED")]);
    expect(series.next).toEqual({ index: 3, book: null });
  });

  it("déclare la saga terminée quand le dernier tome est lu", () => {
    const [series] = groupSeries([volume(1, "FINISHED", 2), volume(2, "FINISHED")]);
    expect(series.next).toBeNull();
  });
});
