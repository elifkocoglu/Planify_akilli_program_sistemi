'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, ArrowRightLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/auth/useUser'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { parseLocalDate } from '@/lib/utils/date'

interface CalendarSlot {
  id: string
  schedule_id: string
  date: string
  start_time: string
  end_time: string
  status: 'active' | 'swapped' | 'cancelled'
  department_id: string | null
  department_name?: string
  schedule_title?: string
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday-based (0=Mon ... 6=Sun)
  let startWeekday = firstDay.getDay() - 1
  if (startWeekday < 0) startWeekday = 6

  const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = []

  // Previous month padding
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    const y = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, '0'), dy = String(d.getDate()).padStart(2, '0')
    days.push({ date: `${y}-${mo}-${dy}`, day: d.getDate(), isCurrentMonth: false })
  }

  // Current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(year, month, day)
    const y = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, '0'), dy = String(d.getDate()).padStart(2, '0')
    days.push({ date: `${y}-${mo}-${dy}`, day, isCurrentMonth: true })
  }

  // Next month padding
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    const y = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, '0'), dy = String(d.getDate()).padStart(2, '0')
    days.push({ date: `${y}-${mo}-${dy}`, day: d.getDate(), isCurrentMonth: false })
  }

  return days
}

export function MonthlyCalendar() {
  const router = useRouter()
  const { profile } = useUser()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [slots, setSlots] = useState<CalendarSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const todayNow = new Date()
  const todayStr = `${todayNow.getFullYear()}-${String(todayNow.getMonth() + 1).padStart(2, '0')}-${String(todayNow.getDate()).padStart(2, '0')}`

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch range: prev month end to next month start (local time based)
    const sd = new Date(year, month - 1, 1)
    const ed = new Date(year, month + 2, 0)
    const startDate = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-01`
    const endDate = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}-${String(ed.getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('schedule_slots')
      .select(`
        id, schedule_id, date, start_time, end_time, status, department_id,
        departments(name),
        schedules(title, status)
      `)
      .eq('staff_id', profile.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('status', 'cancelled')
      .order('date', { ascending: true })

    if (!error && data) {
      setSlots(
        data.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          schedule_id: s.schedule_id as string,
          date: s.date as string,
          start_time: s.start_time as string,
          end_time: s.end_time as string,
          status: s.status as CalendarSlot['status'],
          department_id: s.department_id as string | null,
          department_name: (s.departments as Record<string, string> | null)?.name,
          schedule_title: (s.schedules as Record<string, string> | null)?.title,
        }))
      )
    }
    setLoading(false)
  }, [year, month, profile.id])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const days = getMonthDays(year, month)
  const slotsByDate = slots.reduce<Record<string, CalendarSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []
    acc[slot.date].push(slot)
    return acc
  }, {})

  const goToMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const statusColors: Record<string, string> = {
    active: 'bg-blue-500',
    swapped: 'bg-amber-500',
    cancelled: 'bg-red-500',
  }

  const statusLabels: Record<string, string> = {
    active: 'Aktif',
    swapped: 'Takas Edildi',
    cancelled: 'İptal',
  }

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToMonth(-1)}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold text-white min-w-[180px] text-center">
            {MONTHS_TR[month]} {year}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToMonth(1)}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          Bu Ay
        </Button>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} className="h-20 bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_TR.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-slate-400 py-2 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((dayInfo, idx) => {
              const daySlots = slotsByDate[dayInfo.date] || []
              const isToday = dayInfo.date === todayStr
              const hasSlots = daySlots.length > 0

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (hasSlots) setSelectedSlot(daySlots[0])
                  }}
                  className={`
                    min-h-[80px] rounded-lg p-2 transition-all duration-150
                    ${!dayInfo.isCurrentMonth ? 'opacity-30' : ''}
                    ${isToday ? 'ring-2 ring-blue-500/50 bg-blue-500/10' : 'bg-white/[0.03]'}
                    ${hasSlots ? 'cursor-pointer hover:bg-white/10' : ''}
                    border ${isToday ? 'border-blue-500/30' : 'border-white/5'}
                  `}
                >
                  <span
                    className={`text-sm font-medium ${
                      isToday
                        ? 'text-blue-400'
                        : dayInfo.isCurrentMonth
                          ? 'text-slate-300'
                          : 'text-slate-600'
                    }`}
                  >
                    {dayInfo.day}
                  </span>

                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="mt-1 flex items-center gap-1"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColors[slot.status]}`} />
                      <span className="text-[10px] text-slate-300 truncate">
                        {formatTime(slot.start_time)}-{formatTime(slot.end_time)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Slot Detail Modal */}
      <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Nöbet Detayı</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSlot(null)}
                className="text-slate-400 hover:text-white -mr-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Tarih</p>
                  <p className="text-sm font-medium text-white">
                    {parseLocalDate(selectedSlot.date).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      weekday: 'long',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Saat</p>
                  <p className="text-sm font-medium text-white">
                    {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
                  </p>
                </div>
              </div>

              {selectedSlot.department_name && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Departman</p>
                  <p className="text-sm font-medium text-white">{selectedSlot.department_name}</p>
                </div>
              )}

              {selectedSlot.schedule_title && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Program</p>
                  <p className="text-sm font-medium text-white">{selectedSlot.schedule_title}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-400 mb-1">Durum</p>
                <Badge
                  variant="outline"
                  className={`${
                    selectedSlot.status === 'active'
                      ? 'border-emerald-500/30 text-emerald-400'
                      : selectedSlot.status === 'swapped'
                        ? 'border-amber-500/30 text-amber-400'
                        : 'border-red-500/30 text-red-400'
                  }`}
                >
                  {statusLabels[selectedSlot.status]}
                </Badge>
              </div>

              {selectedSlot.status === 'active' && selectedSlot.date >= todayStr && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    setSelectedSlot(null)
                    router.push(`/dashboard/staff/swap/new?mySlotId=${selectedSlot.id}`)
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Takas Talebi Oluştur
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
