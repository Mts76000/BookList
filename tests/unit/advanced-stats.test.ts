import { describe, expect, it } from "vitest";
import { computeAdvancedStats, readingStreaks, type StatsBook } from "@/lib/advanced-stats";

const TODAY = new Date("2026-10-29T12:00:00Z");

function entry(overrides: Partial<StatsBook>): StatsBook {
  return {
    author: "Auteur",
    genre: null,
    pageCount: null,
    userRating: null,
    status: "FINISHED",
    userStartDate: null,
    userEndDate: null,
    ...overrides,
  };
}

describe("readingStreaks", () => {
  it("compte la série en cours même si l'on n'a pas encore lu aujourd'hui", () => {
    const streaks = readingStreaks(
      [
        { date: "2026-10-26", pagesRead: 10 },
        { date: "2026-10-27", pagesRead: 5 },
        { date: "2026-10-28", pagesRead: 20 },
      ],
      TODAY,
    );
    expect(streaks).toMatchObject({ current: 3, longest: 3 });
  });

  it("rompt la série après un jour sans lecture et garde le record", () => {
    const streaks = readingStreaks(
      [
        { date: "2026-10-01", pagesRead: 10 },
        { date: "2026-10-02", pagesRead: 10 },
        { date: "2026-10-03", pagesRead: 10 },
        { date: "2026-10-04", pagesRead: 0 },
        { date: "2026-10-29", pagesRead: 8 },
      ],
      TODAY,
    );
    expect(streaks).toMatchObject({ current: 1, longest: 3 });
  });

  it("vaut zéro sans activité", () => {
    expect(readingStreaks([], TODAY)).toEqual({ current: 0, longest: 0, jokersUsedThisMonth: 0 });
  });

  it("couvre un jour manqué avec un joker sans le compter comme lu", () => {
    const activities = [
      { date: "2026-10-25", pagesRead: 10 },
      { date: "2026-10-26", pagesRead: 10 },
      // 27 manqué
      { date: "2026-10-28", pagesRead: 10 },
      { date: "2026-10-29", pagesRead: 10 },
    ];
    expect(readingStreaks(activities, TODAY, 0).current).toBe(2);
    expect(readingStreaks(activities, TODAY, 2)).toMatchObject({
      current: 4,
      jokersUsedThisMonth: 1,
    });
  });

  it("rompt la série une fois les jokers du mois épuisés", () => {
    const activities = [
      { date: "2026-10-20", pagesRead: 10 },
      // 21, 22 et 23 manqués : trois jours pour deux jokers.
      { date: "2026-10-24", pagesRead: 10 },
    ];
    expect(readingStreaks(activities, new Date("2026-10-24T12:00:00Z"), 2).current).toBe(1);
  });
});

describe("computeAdvancedStats", () => {
  const books = [
    entry({
      genre: "Roman, Classique",
      pageCount: 300,
      userRating: 5,
      userStartDate: new Date("2026-01-01"),
      userEndDate: new Date("2026-01-11"),
    }),
    entry({
      genre: "Roman",
      pageCount: 500,
      userRating: 3,
      userStartDate: new Date("2026-02-01"),
      userEndDate: new Date("2026-02-21"),
    }),
    entry({ status: "TO_READ" }),
    entry({ status: "TO_READ" }),
    entry({ status: "READING" }),
  ];

  const stats = computeAdvancedStats(books, [], 2026, TODAY);

  it("répartit les livres terminés par mois", () => {
    expect(stats.months[0]).toEqual({ month: 0, books: 1, pages: 300 });
    expect(stats.months[1]).toEqual({ month: 1, books: 1, pages: 500 });
    expect(stats.months.slice(2).every((m) => m.books === 0)).toBe(true);
  });

  it("calcule moyennes, notes, genres et statuts", () => {
    expect(stats.averageDaysPerBook).toBe(15);
    expect(stats.averagePages).toBe(400);
    expect(stats.ratings).toEqual([0, 0, 1, 0, 1]);
    expect(stats.genres[0]).toEqual({ genre: "Roman", count: 2 });
    expect(stats.byStatus).toEqual({ toRead: 2, reading: 1, finished: 2, abandoned: 0 });
  });

  it("estime le temps pour vider la pile à lire au rythme des 12 derniers mois", () => {
    // 2 livres en un an : 1/6 par mois, 2 livres à lire : 12 mois.
    expect(stats.backlogMonths).toBe(12);
  });
});

describe("livres abandonnés", () => {
  it("ne comptent pas comme lus même avec une date d'arrêt", () => {
    const stats = computeAdvancedStats(
      [
        {
          author: "Joyce",
          genre: null,
          pageCount: 900,
          userRating: null,
          status: "ABANDONED",
          userStartDate: new Date("2026-01-01"),
          userEndDate: new Date("2026-01-20"),
        },
      ],
      [],
      2026,
      TODAY,
    );
    expect(stats.months[0].books).toBe(0);
    expect(stats.averagePages).toBeNull();
    expect(stats.byStatus.abandoned).toBe(1);
  });
});
