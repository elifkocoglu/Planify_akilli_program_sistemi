import { supabase } from '@/lib/supabase/client'

export async function createSwapRequest(requesterId: string, note: string) {
  const { data, error } = await supabase
    .from('swap_requests')
    .insert({ requester_id: requesterId, note, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMySwapRequests(userId: string) {
  const { data, error } = await supabase
    .from('swap_requests')
    .select('id, note, status, created_at, updated_at')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
