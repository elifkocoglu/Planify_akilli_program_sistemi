import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'

interface UseRealtimeUpdatesOptions {
  table: string
  filter?: string
  onUpdate: () => void
}

export function useRealtimeUpdates({ table, filter, onUpdate }: UseRealtimeUpdatesOptions) {
  const { user } = useAuth()
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`realtime-${table}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter ?? `user_id=eq.${user.id}`,
        },
        () => onUpdateRef.current()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, table, filter])
}
