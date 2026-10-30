import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSeriesQuery, parseSeriesResponse, type FetchedSeries } from "@/lib/wikidata";
import { chooseSeries, missingVolumes } from "@/lib/series-detection";

/** Réponse réelle de Wikidata à une recherche « harry potter et la chambre des secrets ». */
const harryPotter = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/wikidata-harry-potter.json"), "utf8"),
);

describe("parseSeriesResponse", () => {
  const [series] = parseSeriesResponse(harryPotter);

  it("regroupe les tomes de la saga, dans l'ordre, une seule fois chacun", () => {
    expect(series.id).toBe("Q8337");
    expect(series.name).toBe("Harry Potter");
    const numbered = series.volumes.filter((volume) => volume.index !== null);
    expect(numbered.map((volume) => volume.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(numbered[0]).toMatchObject({ title: "Harry Potter à l'école des sorciers", year: 1997 });
  });

  it("range le prélude et la pièce de théâtre en hors-série", () => {
    const extras = new Set(
      series.volumes.filter((volume) => volume.index === null).map((volume) => volume.title),
    );
    // Wikidata a deux fiches pour « L'Enfant maudit » (la pièce et son texte publié).
    expect(extras).toEqual(new Set(["Harry Potter et l'enfant maudit", "Prologue à Harry Potter"]));
  });
});

describe("buildSeriesQuery", () => {
  it("échappe les guillemets du titre", () => {
    expect(buildSeriesQuery('Le "dernier" tome')).toContain('mwapi:search "Le \\"dernier\\" tome"');
  });
});

const volume = (id: string, title: string, index: number | null) => ({
  id,
  title,
  index,
  year: null,
});

describe("chooseSeries", () => {
  const trilogy: FetchedSeries = {
    id: "Q1",
    name: "Foundation Trilogy",
    volumes: [
      volume("a", "Fondation", 1),
      volume("b", "Fondation et Empire", 2),
      volume("c", "Seconde Fondation", 3),
    ],
  };
  const cycle: FetchedSeries = {
    id: "Q2",
    name: "Cycle de Fondation",
    volumes: [
      volume("p", "Prélude à Fondation", 1),
      volume("q", "L'Aube de Fondation", 2),
      volume("a", "Fondation", 3),
      volume("b", "Fondation et Empire", 4),
      volume("c", "Seconde Fondation", 5),
      volume("d", "Fondation foudroyée", 6),
      volume("e", "Terre et Fondation", 7),
    ],
  };

  it("préfère la saga la plus courte quand les deux contiennent les tomes possédés", () => {
    const books = [
      { title: "Fondation", seriesIndex: 1 },
      { title: "Fondation et Empire", seriesIndex: 2 },
    ];
    expect(chooseSeries([cycle, trilogy], books)?.id).toBe("Q1");
  });

  it("préfère celle qui contient le plus de tomes possédés", () => {
    const books = [
      { title: "Fondation", seriesIndex: 3 },
      { title: "Fondation foudroyée", seriesIndex: 6 },
    ];
    expect(chooseSeries([trilogy, cycle], books)?.id).toBe("Q2");
  });

  it("ne retient aucune saga sans tome en commun", () => {
    expect(chooseSeries([trilogy], [{ title: "Dune", seriesIndex: 1 }])).toBeNull();
  });
});

describe("missingVolumes", () => {
  const [series] = parseSeriesResponse(harryPotter);

  it("propose les tomes numérotés ni rangés dans la saga ni présents ailleurs", () => {
    const missing = missingVolumes(
      series,
      [
        { title: "Harry Potter à l'école des sorciers", seriesIndex: 1 },
        { title: "Harry Potter et la Chambre des secrets", seriesIndex: 2 },
      ],
      // Le tome 3 est déjà en bibliothèque, sans avoir été rangé dans la saga.
      ["Harry Potter et le prisonnier d'Azkaban"],
    );
    expect(missing.map((entry) => entry.index)).toEqual([4, 5, 6, 7]);
  });
});
