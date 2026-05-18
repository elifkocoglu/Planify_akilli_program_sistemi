import { supabase } from '@/lib/supabase/client'

export async function getMySchedule(userId: string, daysAhead = 30) {
  const today = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const { data, error } = await supabase
    .from('schedule_assignments')
    .select(`
      id, date,
      schedule_slots (
        start_time, end_time,
        shift_types (name),
        departments (name)
      )
    `)
    .eq('staff_id', userId)
    .gte('date', today)
    .lte('date', future)
    .order('date', { ascending: true })

  if (error) throw error
  return data ?? []
}
