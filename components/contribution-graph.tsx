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

const PERIODS = [
  { label: "1 mois", weeks: 4 },
  { label: "6 mois", weeks: 26 },
  { label: "1 an", weeks: 52 },
] as const;

/** Côté d'une case, partagé avec les étiquettes de jour pour qu'elles restent alignées. */
const CELL_SIZE = 14;

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

export function ContributionGraph({ activities }: ContributionGraphProps) {
  const [periodIndex, setPeriodIndex] = useState(0);

  const totalDays = PERIODS[periodIndex].weeks * 7;
  const activityMap = new Map(activities.map((a) => [a.date, a.pagesRead]));

  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = dayOffset(totalDays - 1 - i);
    return { date, pagesRead: activityMap.get(date) ?? 0 };
  });

  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Le nom du mois n'apparaît qu'à la semaine où il change — et seulement s'il reste assez
  // de colonnes avant le suivant : une colonne fait 14px, un libellé environ 20px, donc deux
  // mois trop rapprochés se chevaucheraient ("JuilAoû").
  const MIN_WEEKS_BETWEEN_LABELS = 2;
  let lastLabelIndex = -Infinity;
  const monthLabels = weeks.map((week, index) => {
    const current = new Date(week[0].date).getMonth();
    const previous = index > 0 ? new Date(weeks[index - 1][0].date).getMonth() : null;
    const isChange = index === 0 || current !== previous;
    if (!isChange || index - lastLabelIndex < MIN_WEEKS_BETWEEN_LABELS) return null;
    lastLabelIndex = index;
    return MONTHS[current];
  });

  const totalPages = days.reduce((sum, d) => sum + d.pagesRead, 0);
  const activeDays = days.filter((d) => d.pagesRead > 0).length;
  // Colonnes à largeur fixe, et non en fractions de la largeur disponible : sur « 1 mois »
  // il n'y a que quatre colonnes, qui s'étiraient alors sur tout l'écran et transformaient
  // les cases en barres horizontales. Le conteneur défile pour la période « 1 an ».
  const gridColumns = `repeat(${weeks.length}, ${CELL_SIZE}px)`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-stone-500">
          {totalPages} pages · {activeDays} jour{activeDays !== 1 ? "s" : ""} actif
          {activeDays !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-1 rounded-lg bg-stone-100 p-0.5">
          {PERIODS.map((period, index) => (
            <button
              key={period.label}
              type="button"
              onClick={() => setPeriodIndex(index)}
              aria-pressed={index === periodIndex}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                index === periodIndex
                  ? "bg-card text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto overflow-y-visible px-1">
        <div className="flex w-full gap-1.5">
          <div className="flex shrink-0 flex-col gap-[3px] pt-[17px]">
            {["L", "", "M", "", "V", "", "D"].map((day, i) => (
              <div
                key={i}
                className="flex w-4 items-center text-[10px] text-stone-400"
                style={{ height: `${CELL_SIZE}px` }}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="relative mb-[3px] grid gap-[3px]"
              style={{ gridTemplateColumns: gridColumns, height: "12px" }}
            >
              {weeks.map((week, weekIndex) =>
                monthLabels[weekIndex] ? (
                  <div
                    key={week[0].date}
                    className="overflow-visible text-[10px] whitespace-nowrap text-stone-400"
                  >
                    {monthLabels[weekIndex]}
                  </div>
                ) : (
                  <div key={week[0].date} />
                ),
              )}
            </div>

            <div className="grid gap-[3px]" style={{ gridTemplateColumns: gridColumns }}>
              {weeks.map((week) => (
                <div key={week[0].date} className="grid gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className={`rounded-[3px] ${colorFor(day.pagesRead)}`}
                      style={{ height: `${CELL_SIZE}px`, width: `${CELL_SIZE}px` }}
                      title={`${new Date(day.date).toLocaleDateString("fr-FR")} : ${day.pagesRead} pages`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
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
