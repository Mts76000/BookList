"use client";

import { useState } from "react";

interface ReadingActivity {
  /** Jour civil au format `YYYY-MM-DD`. */
  date: string;
  pagesRead: number;
}

interface ContributionGraphProps {
  activities: ReadingActivity[];
}

/**
 * Sur un mois, une grille de semaines n'aurait que quatre ou cinq colonnes : elle laissait
 * l'essentiel de la carte vide. On y affiche plutôt un histogramme d'un trait par jour, qui
 * remplit la largeur et donne à lire les volumes. Sur 6 mois et un an, la grille façon
 * calendrier reste la plus lisible.
 */
const PERIODS = [
  { label: "1 mois", days: 30, view: "bars" },
  { label: "6 mois", days: 26 * 7, view: "grid" },
  { label: "1 an", days: 52 * 7, view: "grid" },
] as const;

const MONTHS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

const DAY_LABELS = ["L", "", "M", "", "V", "", "D"];

/** Intensité de la case selon le nombre de pages lues ce jour-là. */
function colorFor(pagesRead: number): string {
  if (pagesRead === 0) return "bg-stone-100";
  if (pagesRead < 20) return "bg-accent-100";
  if (pagesRead < 50) return "bg-accent-200";
  if (pagesRead < 100) return "bg-accent-400";
  return "bg-accent-600";
}

/** Jour civil décalé de `daysAgo` jours, au format `YYYY-MM-DD`. */
function dayOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function formatDay(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

type Day = { date: string; pagesRead: number };

export function ContributionGraph({ activities }: ContributionGraphProps) {
  const [periodIndex, setPeriodIndex] = useState(0);
  const period = PERIODS[periodIndex];

  const activityMap = new Map(activities.map((a) => [a.date, a.pagesRead]));
  const days: Day[] = Array.from({ length: period.days }, (_, i) => {
    const date = dayOffset(period.days - 1 - i);
    return { date, pagesRead: activityMap.get(date) ?? 0 };
  });

  const totalPages = days.reduce((sum, d) => sum + d.pagesRead, 0);
  const activeDays = days.filter((d) => d.pagesRead > 0).length;
  const average = activeDays > 0 ? Math.round(totalPages / activeDays) : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          <span className="font-medium text-stone-900 tabular-nums">{totalPages}</span> pages,{" "}
          <span className="font-medium text-stone-900 tabular-nums">{activeDays}</span> jour
          {activeDays !== 1 ? "s" : ""} actif{activeDays !== 1 ? "s" : ""}
          {average > 0 && `, ${average} pages par jour actif`}
        </p>
        <div className="flex gap-1 rounded-lg bg-stone-100 p-0.5">
          {PERIODS.map((entry, index) => (
            <button
              key={entry.label}
              type="button"
              onClick={() => setPeriodIndex(index)}
              aria-pressed={index === periodIndex}
              className={`min-h-8 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                index === periodIndex
                  ? "bg-card text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {period.view === "bars" ? <DailyBars days={days} /> : <CalendarGrid days={days} />}
    </div>
  );
}

/** Un trait par jour, hauteur proportionnelle au jour le plus chargé de la période. */
function DailyBars({ days }: { days: Day[] }) {
  const max = Math.max(...days.map((d) => d.pagesRead), 1);

  return (
    <div>
      <div className="flex h-40 items-end gap-[3px] sm:gap-1">
        {days.map((day) => (
          <div
            key={day.date}
            className="group relative flex h-full flex-1 items-end"
            title={`${formatDay(day.date)} : ${day.pagesRead} pages`}
          >
            <div
              className={`w-full rounded-t-[3px] transition-colors ${
                day.pagesRead > 0
                  ? "bg-accent-400 group-hover:bg-accent-600"
                  : "bg-stone-100 group-hover:bg-stone-200"
              }`}
              style={{
                height: day.pagesRead > 0 ? `${Math.max((day.pagesRead / max) * 100, 4)}%` : "3px",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-stone-400">
        <span>{formatDay(days[0].date)}</span>
        <span>{formatDay(days[Math.floor(days.length / 2)].date)}</span>
        <span>Aujourd&apos;hui</span>
      </div>
      <p className="sr-only">
        {days
          .filter((d) => d.pagesRead > 0)
          .map((d) => `${formatDay(d.date)} : ${d.pagesRead} pages`)
          .join(", ")}
      </p>
    </div>
  );
}

/**
 * Grille calendrier : une colonne par semaine, une ligne par jour. Les colonnes se partagent
 * la largeur disponible (cases carrées, 10px minimum), si bien que la grille remplit la carte
 * quelle que soit la période ; sous ce minimum, sur mobile pour l'année, elle défile.
 */
function CalendarGrid({ days }: { days: Day[] }) {
  const weeks: Day[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  // Le nom du mois n'apparaît qu'à la semaine où il change, et seulement s'il reste assez
  // de colonnes avant le suivant pour ne pas chevaucher le libellé voisin ("JuilAoû").
  const MIN_WEEKS_BETWEEN_LABELS = 3;
  let lastLabelIndex = -Infinity;
  const monthLabels = weeks.map((week, index) => {
    const current = new Date(week[0].date).getMonth();
    const previous = index > 0 ? new Date(weeks[index - 1][0].date).getMonth() : null;
    const isChange = index === 0 || current !== previous;
    if (!isChange || index - lastLabelIndex < MIN_WEEKS_BETWEEN_LABELS) return null;
    lastLabelIndex = index;
    return MONTHS[current];
  });

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: `1rem repeat(${weeks.length}, minmax(10px, 1fr))`,
            gridTemplateRows: "auto",
            minWidth: `${weeks.length * 13 + 20}px`,
          }}
        >
          <div />
          {weeks.map((week, weekIndex) => (
            <div
              key={`label-${week[0].date}`}
              className="h-4 overflow-visible text-[10px] whitespace-nowrap text-stone-400"
            >
              {monthLabels[weekIndex]}
            </div>
          ))}

          {DAY_LABELS.map((label, dayIndex) => (
            <div key={`row-${dayIndex}`} className="contents">
              <div className="flex items-center text-[10px] text-stone-400">{label}</div>
              {weeks.map((week) => {
                const day = week[dayIndex];
                return day ? (
                  <div
                    key={day.date}
                    className={`aspect-square w-full rounded-[3px] ${colorFor(day.pagesRead)}`}
                    title={`${formatDay(day.date)} : ${day.pagesRead} pages`}
                  />
                ) : (
                  <div key={`${week[0].date}-${dayIndex}`} />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-stone-400">
        <span>Moins</span>
        <div className="flex gap-[3px]">
          {["bg-stone-100", "bg-accent-100", "bg-accent-200", "bg-accent-400", "bg-accent-600"].map(
            (color) => (
              <div key={color} className={`h-[11px] w-[11px] rounded-[3px] ${color}`} />
            ),
          )}
        </div>
        <span>Plus</span>
      </div>
    </div>
  );
}
