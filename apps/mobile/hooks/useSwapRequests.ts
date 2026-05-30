import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type SwapStatus = 'pending' | 'approved_by_receiver' | 'approved_by_admin' | 'rejected' | 'cancelled'

export interface SwapSlotInfo {
  id: string
  date: string
  start_time: string
  end_time: string
  departments: { name: string } | null
}

export interface SwapRequest {
  id: string
  status: SwapStatus
  created_at: string
  reject_reason: string | null
  requester: { id: string; full_name: string } | null
  receiver: { id: string; full_name: string } | null
  requester_slot: SwapSlotInfo | null
  receiver_slot: SwapSlotInfo | null
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useSwapRequests() {
  const { user } = useAuth()

  const [allRequests, setAllRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [realtimeToast, setRealtimeToast] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // ── Fetch ──────────────────────────────────────────────────
  const fetchSwapRequests = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('swap_requests')
        .select(`
          id, status, created_at, reject_reason,
          requester:profiles!requester_id(id, full_name),
          receiver:profiles!receiver_id(id, full_name),
          requester_slot:schedule_slots!requester_slot_id(
            id, date, start_time, end_time,
            departments(name)
          ),
          receiver_slot:schedule_slots!receiver_slot_id(
            id, date, start_time, end_time,
            departments(name)
          )
        `)
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Takas talepleri yüklenemedi:', error.message)
        return
      }

      if (mountedRef.current) {
        setAllRequests((data as unknown as SwapRequest[]) ?? [])
      }
    } catch (err) {
      console.error('Takas talepleri yüklenemedi:', err)
    }
  }, [user?.id])

  // ── Initial load ───────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    async function init() {
      setLoading(true)
      await fetchSwapRequests()
      if (mountedRef.current) setLoading(false)
    }
    init()
    return () => { mountedRef.current = false }
  }, [fetchSwapRequests])

  // ── Realtime subscription ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('swap-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swap_requests',
          filter: `requester_id=eq.${user.id}`,
        },
        () => {
          fetchSwapRequests()
          if (mountedRef.current) setRealtimeToast('Takas talebiniz güncellendi')
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swap_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchSwapRequests()
          if (mountedRef.current) setRealtimeToast('Takas talebiniz güncellendi')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchSwapRequests])

  // Clear toast after reading
  const clearRealtimeToast = useCallback(() => {
    setRealtimeToast(null)
  }, [])

  // ── Derived data ───────────────────────────────────────────
  const sentRequests = allRequests.filter((r) => r.requester?.id === user?.id)
  const receivedRequests = allRequests.filter((r) => r.receiver?.id === user?.id)

  return {
    sentRequests,
    receivedRequests,
    loading,
    refresh: fetchSwapRequests,
    realtimeToast,
    clearRealtimeToast,
  }
}
