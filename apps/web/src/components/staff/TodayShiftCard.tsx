'use client'

import Link from 'next/link'
import { Clock, MapPin, ChevronRight, Calendar } from 'lucide-react'
import { parseLocalDate } from '@/lib/utils/date'

interface SlotData {
  id: string
  date: string
  start_time: string
  end_time: string
  department_name?: string
  schedule_id?: string
}

interface TodayShiftCardProps {
  todaySlot: SlotData | null
  nextSlotDate: string | null
}

function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  })
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function TodayShiftCard({ todaySlot, nextSlotDate }: TodayShiftCardProps) {
  if (todaySlot) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
              Bugün Nöbetiniz Var
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span className="text-2xl font-bold">
                {formatTime(todaySlot.start_time)} - {formatTime(todaySlot.end_time)}
              </span>
            </div>
          </div>

          {todaySlot.department_name && (
            <div className="flex items-center gap-2 text-slate-300 mb-4">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-sm">{todaySlot.department_name}</span>
            </div>
          )}

          <Link
            href={`/dashboard/staff/schedule`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Detayları Gör
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Bugün Nöbetiniz Yok
          </span>
        </div>

        {nextSlotDate ? (
          <div className="flex items-center gap-2 text-slate-300 mt-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm">
              Bir sonraki nöbetiniz:{' '}
              <span className="text-white font-medium">{formatDate(nextSlotDate)}</span>
            </span>
          </div>
        ) : (
          <p className="text-sm text-slate-400 mt-2">Planlanmış nöbetiniz bulunmuyor.</p>
        )}
      </div>
    </div>
  )
}
