"use client"

import { useState } from "react"

interface ReadingActivity {
  date: Date
  pagesRead: number
}

interface ContributionGraphProps {
  activities: ReadingActivity[]
}

const PERIODS = [
  { label: "1 mois", weeks: 4 },
  { label: "3 mois", weeks: 13 },
  { label: "6 mois", weeks: 26 },
  { label: "1 an", weeks: 52 },
] as const

const CELL_HEIGHT = 14 // px — hauteur fixe des cases ET des étiquettes de jour, pour un alignement parfait

export function ContributionGraph({ activities }: ContributionGraphProps) {
  const [periodIndex, setPeriodIndex] = useState(2) // 6 mois par défaut

  const weeksToShow = PERIODS[periodIndex].weeks
  const totalDays = weeksToShow * 7

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (totalDays - 1))

  const activityMap = new Map<string, number>()
  activities.forEach((activity) => {
    const date = new Date(activity.date)
    date.setHours(0, 0, 0, 0)
    const dateStr = date.toISOString().split("T")[0]
    activityMap.set(dateStr, activity.pagesRead)
  })

  const days: { date: string; pagesRead: number }[] = []
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split("T")[0]
    days.push({ date: dateStr, pagesRead: activityMap.get(dateStr) || 0 })
  }

  const getColor = (pagesRead: number) => {
    if (pagesRead === 0) return "bg-stone-100"
    if (pagesRead < 20) return "bg-amber-200"
    if (pagesRead < 50) return "bg-amber-300"
    if (pagesRead < 100) return "bg-amber-400"
    return "bg-amber-500"
  }

  const weeks: typeof days[] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]

  // Affiche le nom du mois seulement au changement de mois, pas en double.
  const monthLabels = weeks.map((week, index) => {
    const current = new Date(week[0].date).getMonth()
    if (index === 0) return months[current]
    const previous = new Date(weeks[index - 1][0].date).getMonth()
    return current !== previous ? months[current] : null
  })

  const totalPages = days.reduce((sum, d) => sum + d.pagesRead, 0)
  const activeDays = days.filter((d) => d.pagesRead > 0).length

  // Grille en cases carrées fixes (14px) avec défilement horizontal si besoin.
  const gridColumns = `repeat(${weeks.length}, 14px)`

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-stone-500">
          {totalPages} pages · {activeDays} jour{activeDays !== 1 ? "s" : ""} actif{activeDays !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-1 rounded-lg bg-stone-100 p-0.5">
          {PERIODS.map((period, index) => (
            <button
              key={period.label}
              onClick={() => setPeriodIndex(index)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                index === periodIndex
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-visible -mx-1 px-1">
        <div className="flex w-full gap-1.5" style={{ minWidth: `${weeks.length * 17 + 40}px` }}>
          <div className="flex shrink-0 flex-col gap-[3px] pt-[17px]">
            {["L", "", "M", "", "V", "", "D"].map((day, i) => (
              <div
                key={i}
                className="flex w-4 items-center text-[10px] text-stone-400"
                style={{ height: `${CELL_HEIGHT}px` }}
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
              {weeks.map((week, weekIndex) => {
                const label = monthLabels[weekIndex]
                if (label) {
                  return (
                    <div
                      key={weekIndex}
                      className="overflow-visible whitespace-nowrap text-[10px] text-stone-400"
                    >
                      {label}
                    </div>
                  )
                }
                return <div key={weekIndex} />
              })}
            </div>

            <div className="grid gap-[3px]" style={{ gridTemplateColumns: gridColumns }}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className={`w-full rounded-sm ${getColor(day.pagesRead)}`}
                      style={{ height: `${CELL_HEIGHT}px` }}
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
          <div className="h-[11px] w-[11px] rounded-sm bg-stone-100" />
          <div className="h-[11px] w-[11px] rounded-sm bg-amber-200" />
          <div className="h-[11px] w-[11px] rounded-sm bg-amber-300" />
          <div className="h-[11px] w-[11px] rounded-sm bg-amber-400" />
          <div className="h-[11px] w-[11px] rounded-sm bg-amber-500" />
        </div>
        <span>Plus</span>
      </div>
    </div>
  )
}
