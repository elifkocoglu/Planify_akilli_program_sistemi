'use client'

import Link from 'next/link'
import { Clock, MapPin, ArrowRight } from 'lucide-react'
import { parseLocalDate } from '@/lib/utils/date'

interface SlotData {
  id: string
  date: string
  start_time: string
  end_time: string
  department_name?: string
}

interface UpcomingShiftsListProps {
  slots: SlotData[]
  todayDate: string
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

function getDayName(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('tr-TR', { weekday: 'long' })
}

function formatShortDate(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

export function UpcomingShiftsList({ slots, todayDate }: UpcomingShiftsListProps) {
  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Yaklaşan Nöbetler</h3>
        <div className="text-center py-8">
          <p className="text-slate-400">Gelecek 7 günde planlanmış nöbetiniz yok.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Yaklaşan Nöbetler</h3>
        <Link
          href="/dashboard/staff/schedule"
          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Tüm Programı Gör
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        {slots.map((slot) => {
          const isToday = slot.date === todayDate
          return (
            <div
              key={slot.id}
              className={`flex items-center gap-4 rounded-lg px-4 py-3 transition-colors ${
                isToday
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-white/5 border border-transparent hover:border-white/10'
              }`}
            >
              <div className="flex-shrink-0 w-14 text-center">
                <p className={`text-xs font-medium uppercase ${isToday ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isToday ? 'Bugün' : getDayName(slot.date).slice(0, 3)}
                </p>
                <p className="text-sm font-bold text-white">{formatShortDate(slot.date)}</p>
              </div>

              <div className="w-px h-8 bg-white/10" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </span>
                </div>
                {slot.department_name && (
                  <div className="flex items-center gap-2 text-slate-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs truncate">{slot.department_name}</span>
                  </div>
                )}
              </div>

              {isToday && (
                <span className="flex-shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                  Aktif
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
