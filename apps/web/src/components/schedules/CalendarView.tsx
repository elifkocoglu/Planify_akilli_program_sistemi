'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlotEditModal } from './SlotEditModal'
import type { SlotRecord } from '@/lib/api/types'

interface StaffOption {
  id: string
  full_name: string
}

interface CalendarViewProps {
  slots: SlotRecord[]
  scheduleId: string
  isDraft: boolean
  staffList: StaffOption[]
  startDate: string
  endDate: string
}

const dayHeaders = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

// 10 distinct colors for staff
const staffColors = [
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-teal-500/20 text-teal-300 border-teal-500/30',
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function CalendarView({
  slots,
  scheduleId,
  isDraft,
  staffList,
  startDate,
  endDate,
}: CalendarViewProps) {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date(startDate)))
  const [editSlot, setEditSlot] = useState<SlotRecord | null>(null)

  // Map staff to colors
  const staffColorMap = useMemo(() => {
    const map = new Map<string, string>()
    const uniqueStaffIds = Array.from(new Set(slots.map((s) => s.staff_id)))
    uniqueStaffIds.forEach((id, i) => {
      map.set(id, staffColors[i % staffColors.length])
    })
    return map
  }, [slots])

  // Build week days
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [weekStart])

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, SlotRecord[]>()
    for (const slot of slots) {
      if (slot.status === 'cancelled') continue
      const key = slot.date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(slot)
    }
    // Sort each day by start_time
    Array.from(map.values()).forEach((arr) => {
      arr.sort((a: SlotRecord, b: SlotRecord) => a.start_time.localeCompare(b.start_time))
    })
    return map
  }, [slots])

  const navigateWeek = (direction: -1 | 1) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + direction * 7)
    setWeekStart(d)
  }

  const goToday = () => {
    setWeekStart(getMonday(new Date()))
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Legend
  const legendItems = useMemo(() => {
    const items: { id: string; name: string; color: string }[] = []
    const seen = new Set<string>()
    for (const slot of slots) {
      if (seen.has(slot.staff_id)) continue
      seen.add(slot.staff_id)
      items.push({
        id: slot.staff_id,
        name: slot.profiles?.full_name ?? 'Bilinmeyen',
        color: staffColorMap.get(slot.staff_id) ?? staffColors[0],
      })
    }
    return items
  }, [slots, staffColorMap])

  const today = formatDateKey(new Date())

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigateWeek(-1)}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToday}
            className="text-slate-400 hover:text-white"
          >
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            Bugün
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigateWeek(1)}
            className="text-slate-400 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-slate-300 font-medium">
          {weekStart.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
          {' — '}
          {weekEnd.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-white/[0.04]">
          {/* Headers */}
          {weekDays.map((day, i) => {
            const dateKey = formatDateKey(day)
            const isToday = dateKey === today
            return (
              <div
                key={i}
                className={`px-2 py-2.5 text-center border-b border-white/[0.06] ${
                  isToday ? 'bg-blue-500/5' : 'bg-white/[0.02]'
                }`}
              >
                <p className="text-xs font-medium text-slate-400">{dayHeaders[i]}</p>
                <p className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-blue-400' : 'text-white'}`}>
                  {day.getDate()}
                </p>
              </div>
            )
          })}

          {/* Cells */}
          {weekDays.map((day, i) => {
            const dateKey = formatDateKey(day)
            const daySlots = slotsByDate.get(dateKey) ?? []
            const isToday = dateKey === today

            return (
              <div
                key={`cell-${i}`}
                className={`min-h-[120px] p-1.5 ${isToday ? 'bg-blue-500/[0.03]' : ''}`}
              >
                {daySlots.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-slate-600">—</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {daySlots.map((slot) => {
                      const colorClass = staffColorMap.get(slot.staff_id) ?? staffColors[0]
                      return (
                        <button
                          key={slot.id}
                          onClick={() => isDraft && setEditSlot(slot)}
                          disabled={!isDraft}
                          className={`w-full rounded-md border px-2 py-1.5 text-left transition-all ${colorClass} ${
                            isDraft ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          <p className="text-[10px] font-medium leading-tight truncate">
                            {slot.profiles?.full_name ?? '—'}
                          </p>
                          <p className="text-[9px] opacity-70 mt-0.5">
                            {slot.start_time.slice(0, 5)}-{slot.end_time.slice(0, 5)}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      {legendItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <span className="text-xs text-slate-500 font-medium">Personel:</span>
          {legendItems.map((item) => (
            <span
              key={item.id}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${item.color}`}
            >
              {item.name}
            </span>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editSlot && (
        <SlotEditModal
          slot={editSlot}
          scheduleId={scheduleId}
          staffList={staffList}
          open={!!editSlot}
          onClose={() => setEditSlot(null)}
          onSaved={() => {
            setEditSlot(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
