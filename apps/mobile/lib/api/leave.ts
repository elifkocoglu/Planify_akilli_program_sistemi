import { supabase } from '@/lib/supabase/client'

export async function createLeaveRequest(userId: string, note: string) {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({ staff_id: userId, note, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMyLeaveRequests(userId: string) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('id, note, status, created_at, updated_at')
    .eq('staff_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function cancelLeaveRequest(requestId: string) {
  const { error } = await supabase
    .from('leave_requests')
    .delete()
    .eq('id', requestId)

  if (error) throw error
}
