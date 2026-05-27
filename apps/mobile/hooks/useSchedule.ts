import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'

// ─────────────────────────────────────────────────────────────
// Types (exported so schedule.tsx can import them)
// ─────────────────────────────────────────────────────────────

export interface ScheduleSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  status: string
  notes: string | null
  department_name: string | null
  schedule_title: string | null
  schedule_status: string | null
  schedule_type: string | null
}

export interface SelectedMonth {
  year: number
  month: number // 0-indexed (0 = Ocak, 11 = Aralık)
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getMonthBounds(year: number, month: number) {
  // month: 0-indexed
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { monthStart, monthEnd }
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useSchedule() {
  const { user } = useAuth()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [selectedMonth, setSelectedMonth] = useState<SelectedMonth>({
    year: today.getFullYear(),
    month: today.getMonth(), // 0-indexed
  })
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch slots for the selected month ───────────────────
  const fetchSlots = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)

    try {
      const { monthStart, monthEnd } = getMonthBounds(
        selectedMonth.year,
        selectedMonth.month,
      )

      const { data, error: fetchError } = await supabase
        .from('schedule_slots')
        .select(`
          id, date, start_time, end_time, status, notes,
          departments(name),
          schedules!inner(title, status, type)
        `)
        .eq('staff_id', user.id)
        .eq('schedules.status', 'published')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('status', 'active')
        .order('date', { ascending: true })


      if (fetchError) throw fetchError

      const mapped: ScheduleSlot[] = (data ?? []).map((item: any) => ({
        id: item.id,
        date: item.date,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status,
        notes: item.notes ?? null,
        department_name: item.departments?.name ?? null,
        schedule_title: item.schedules?.title ?? null,
        schedule_status: item.schedules?.status ?? null,
        schedule_type: item.schedules?.type ?? null,
      }))

      setSlots(mapped)
    } catch (err: any) {
      console.error('useSchedule: veri alınamadı', err)
      setError('Veriler yüklenemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, selectedMonth.year, selectedMonth.month])

  // Re-fetch when month changes
  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  // ── Navigation helpers ────────────────────────────────────
  function prevMonth() {
    setSelectedMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  function nextMonth() {
    setSelectedMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  // ── Derived: set of dates that have a slot ────────────────
  const slotDates = new Set(slots.map((s) => s.date))

  // ── Selected slot ─────────────────────────────────────────
  const selectedSlot = slots.find((s) => s.date === selectedDate) ?? null

  // ── Go to today ───────────────────────────────────────────
  function goToToday() {
    const now = new Date()
    setSelectedDate(now.toISOString().split('T')[0])
    setSelectedMonth({ year: now.getFullYear(), month: now.getMonth() })
  }

  return {
    // State
    selectedDate,
    setSelectedDate,
    selectedMonth,
    slots,
    slotDates,
    selectedSlot,
    loading,
    error,
    // Actions
    prevMonth,
    nextMonth,
    goToToday,
    refresh: fetchSlots,
    // Util
    todayStr,
  }
}
