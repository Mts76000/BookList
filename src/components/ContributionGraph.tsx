"use client"

interface ReadingActivity {
  date: Date
  pagesRead: number
}

interface ContributionGraphProps {
  activities: ReadingActivity[]
}

export function ContributionGraph({ activities }: ContributionGraphProps) {
  // Generate the last 365 days
  const today = new Date()
  const days = []
  const dayOfWeek = today.getDay()
  
  // Start from 365 days ago
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 364)
  
  // Create a map of activities by date
  const activityMap = new Map<string, number>()
  activities.forEach((activity) => {
    const dateStr = new Date(activity.date).toISOString().split('T')[0]
    activityMap.set(dateStr, activity.pagesRead)
  })
  
  // Generate all days
  for (let i = 0; i < 365; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const pagesRead = activityMap.get(dateStr) || 0
    days.push({ date: dateStr, pagesRead })
  }
  
  // Get color based on pages read
  const getColor = (pagesRead: number) => {
    if (pagesRead === 0) return 'bg-gray-100'
    if (pagesRead < 20) return 'bg-green-200'
    if (pagesRead < 50) return 'bg-green-300'
    if (pagesRead < 100) return 'bg-green-400'
    return 'bg-green-500'
  }
  
  // Organize by weeks (7 days each)
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="flex gap-1 mb-2 pl-8">
          {weeks.map((week, weekIndex) => {
            const date = new Date(week[0].date)
            if (weekIndex % 4 === 0) {
              return (
                <div key={weekIndex} className="text-xs text-gray-400 w-[12px]">
                  {months[date.getMonth()]}
                </div>
              )
            }
            return <div key={weekIndex} className="w-[12px]" />
          })}
        </div>
        
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 mr-2 text-xs text-gray-400">
            {weekDays.map((day) => (
              <div key={day} className="h-[12px] w-[20px] flex items-center">
                {day}
              </div>
            ))}
          </div>
          
          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`w-[12px] h-[12px] rounded-sm ${getColor(day.pagesRead)} transition-colors`}
                    title={`${day.date}: ${day.pagesRead} pages`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-3 text-xs text-gray-500">
          <span>Moins</span>
          <div className="flex gap-1">
            <div className="w-[12px] h-[12px] rounded-sm bg-gray-100" />
            <div className="w-[12px] h-[12px] rounded-sm bg-green-200" />
            <div className="w-[12px] h-[12px] rounded-sm bg-green-300" />
            <div className="w-[12px] h-[12px] rounded-sm bg-green-400" />
            <div className="w-[12px] h-[12px] rounded-sm bg-green-500" />
          </div>
          <span>Plus</span>
        </div>
      </div>
    </div>
  )
}
