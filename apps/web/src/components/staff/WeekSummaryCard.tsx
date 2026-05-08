'use client'

import { CalendarDays, CalendarRange, Clock } from 'lucide-react'

interface WeekSummaryCardProps {
  weekCount: number
  monthCount: number
  monthlyLimit: number | null
  pendingCount: number
}

export function WeekSummaryCard({
  weekCount,
  monthCount,
  monthlyLimit,
  pendingCount,
}: WeekSummaryCardProps) {
  const cards = [
    {
      label: 'Bu Hafta',
      value: weekCount,
      suffix: 'nöbet',
      icon: <CalendarDays className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
    {
      label: 'Bu Ay',
      value: monthCount,
      suffix: monthlyLimit ? `/ ${monthlyLimit}` : 'nöbet',
      icon: <CalendarRange className="w-5 h-5" />,
      color: 'from-violet-500/20 to-violet-600/10',
      iconColor: 'text-violet-400',
      borderColor: 'border-violet-500/20',
    },
    {
      label: 'Bekleyen Talepler',
      value: pendingCount,
      suffix: 'talep',
      icon: <Clock className="w-5 h-5" />,
      color: 'from-amber-500/20 to-amber-600/10',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border ${card.borderColor} bg-gradient-to-br ${card.color} p-5 transition-all duration-200 hover:scale-[1.02]`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">{card.label}</span>
            <div className={card.iconColor}>{card.icon}</div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{card.value}</span>
            <span className="text-sm text-slate-400">{card.suffix}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
