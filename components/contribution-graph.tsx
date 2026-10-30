"use client";

import { useState } from "react";

/**
 * Un seul type de graphique quelle que soit la période : un histogramme, dont chaque barre
 * regroupe un jour, une semaine ou un mois. Le nombre de barres reste lisible (30, 26 ou
 * 12) et changer de période ne change pas la façon de lire le graphique.
 */
const PERIODS = [
  { label: "1 mois", unit: "day", count: 30, caption: "par jour" },
  { label: "6 mois", unit: "week", count: 26, caption: "par semaine" },
  { label: "1 an", unit: "month", count: 12, caption: "par mois" },
] as const;

type Unit = (typeof PERIODS)[number]["unit"];

/** Jour civil local au format `YYYY-MM-DD`. */
function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const shortDay = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const shortMonth = (date: Date) => date.toLocaleDateString("fr-FR", { month: "short" });
const longMonth = (date: Date) =>
  date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

type Bucket = { key: string; start: Date; pages: number; label: string; tooltip: string };

/**
 * Découpe la période en barres, la dernière se terminant aujourd'hui. Les semaines vont du
 * lundi au dimanche et les mois sont des mois civils, pour que chaque barre corresponde à
 * une période qu'on reconnaît.
 */
function buildBuckets(unit: Unit, count: number, pagesByDay: Map<string, number>): Bucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: Bucket[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(today);
    const end = new Date(today);
    if (unit === "day") {
      start.setDate(today.getDate() - i);
      end.setTime(start.getTime());
    } else if (unit === "week") {
      const mondayOffset = (today.getDay() + 6) % 7;
      start.setDate(today.getDate() - mondayOffset - i * 7);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
    } else {
      start.setDate(1);
      start.setMonth(today.getMonth() - i);
      end.setTime(start.getTime());
      end.setMonth(start.getMonth() + 1, 0);
    }

    let pages = 0;
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1))
      pages += pagesByDay.get(dayKey(cursor)) ?? 0;

    const label =
      unit === "month" ? shortMonth(start) : unit === "week" ? shortDay(start) : shortDay(start);
    const span =
      unit === "day"
        ? shortDay(start)
        : unit === "week"
          ? `Semaine du ${shortDay(start)}`
          : longMonth(start);
    buckets.push({ key: dayKey(start), start, pages, label, tooltip: `${span} : ${pages} pages` });
  }
  return buckets;
}

interface ReadingActivity {
  /** Jour civil au format `YYYY-MM-DD`. */
  date: string;
  pagesRead: number;
}

export function ContributionGraph({ activities }: { activities: ReadingActivity[] }) {
  const [periodIndex, setPeriodIndex] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const period = PERIODS[periodIndex];

  const pagesByDay = new Map(activities.map((a) => [a.date, a.pagesRead]));
  const buckets = buildBuckets(period.unit, period.count, pagesByDay);

  // Les totaux portent sur les jours couverts par les barres affichées.
  const firstDay = dayKey(buckets[0].start);
  const daysInRange = activities.filter((a) => a.date >= firstDay && a.pagesRead > 0);
  const totalPages = daysInRange.reduce((sum, a) => sum + a.pagesRead, 0);
  const activeDays = daysInRange.length;
  const average = activeDays > 0 ? Math.round(totalPages / activeDays) : 0;
  const max = Math.max(...buckets.map((b) => b.pages), 1);

  // Quelques repères sous l'axe : le premier, le milieu et le dernier.
  const ticks = new Set([0, Math.floor((buckets.length - 1) / 2), buckets.length - 1]);

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
              onClick={() => {
                setPeriodIndex(index);
                setActiveKey(null);
              }}
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

      <p className="mb-2 text-[11px] text-stone-400">Pages {period.caption}</p>
      {/* Chaque barre est un bouton : survol, clic (au doigt) ou focus clavier affichent sa
          valeur dans une bulle. Elle reste affichée jusqu'à la sortie du graphique. */}
      <div
        className={`flex h-40 items-end pt-8 ${period.unit === "day" ? "gap-[3px] sm:gap-1" : "gap-1 sm:gap-2"}`}
        onMouseLeave={() => setActiveKey(null)}
      >
        {buckets.map((bucket, index) => {
          const isActive = bucket.key === activeKey;
          // Près des bords, la bulle s'aligne sur la barre au lieu de déborder de la carte.
          const align =
            index < buckets.length * 0.15
              ? "left-0"
              : index > buckets.length * 0.85
                ? "right-0"
                : "left-1/2 -translate-x-1/2";
          return (
            <button
              key={bucket.key}
              type="button"
              className="relative flex h-full flex-1 items-end focus:outline-none"
              aria-label={bucket.tooltip}
              aria-pressed={isActive}
              onMouseEnter={() => setActiveKey(bucket.key)}
              onFocus={() => setActiveKey(bucket.key)}
              onBlur={() => setActiveKey(null)}
              onClick={() => setActiveKey(bucket.key)}
            >
              {isActive && (
                <span
                  className={`pointer-events-none absolute bottom-full z-10 mb-1 rounded-[6px] bg-stone-900 px-2 py-1 text-[11px] whitespace-nowrap text-stone-50 shadow-sm ${align}`}
                  role="tooltip"
                >
                  {bucket.tooltip}
                </span>
              )}
              <span
                className={`block w-full rounded-t-[3px] transition-colors ${
                  bucket.pages > 0
                    ? isActive
                      ? "bg-accent-600"
                      : "bg-accent-400"
                    : isActive
                      ? "bg-stone-300"
                      : "bg-stone-100"
                }`}
                style={{
                  height: bucket.pages > 0 ? `${Math.max((bucket.pages / max) * 100, 4)}%` : "3px",
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-stone-400" aria-hidden="true">
        {buckets.map((bucket, index) =>
          ticks.has(index) ? (
            <span key={bucket.key}>
              {index === buckets.length - 1 && period.unit === "day" ? "Aujourd'hui" : bucket.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
