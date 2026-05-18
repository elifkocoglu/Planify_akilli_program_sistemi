import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'

interface ScheduleSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  shiftTypeName: string
  departmentName: string
}

export function useSchedule(daysAhead = 30) {
  const { user } = useAuth()
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const future = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data, error: err } = await supabase
        .from('schedule_assignments')
        .select(`
          id, date,
          schedule_slots (
            start_time, end_time,
            shift_types (name),
            departments (name)
          )
        `)
        .eq('staff_id', user.id)
        .gte('date', today)
        .lte('date', future)
        .order('date', { ascending: true })

      if (err) throw err

      setSlots(
        (data ?? []).map((item: any) => ({
          id: item.id,
          date: item.date,
          startTime: item.schedule_slots?.start_time ?? '',
          endTime: item.schedule_slots?.end_time ?? '',
          shiftTypeName: item.schedule_slots?.shift_types?.name ?? 'Bilinmiyor',
          departmentName: item.schedule_slots?.departments?.name ?? 'Bilinmiyor',
        }))
      )
    } catch {
      setError('Program yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [user, daysAhead])

  useEffect(() => {
    load()
  }, [load])

  return { slots, loading, error, refresh: load }
}
