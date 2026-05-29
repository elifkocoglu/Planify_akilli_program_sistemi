import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'

export interface AppNotification {
  id: string
  title: string
  body: string
  type: string
  relatedId: string | null
  isRead: boolean
  createdAt: string
}

interface UseNotificationsReturn {
  notifications: AppNotification[]
  loading: boolean
  unreadCount: number
  refresh: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  onNewNotification: (cb: (n: AppNotification) => void) => () => void
}

const newNotificationListeners: Array<(n: AppNotification) => void> = []

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const mapRow = (n: Record<string, unknown>): AppNotification => ({
    id: n.id as string,
    title: n.title as string,
    body: (n.body as string) ?? (n.message as string) ?? '',
    type: (n.type as string) ?? 'general',
    relatedId: (n.related_id as string) ?? null,
    isRead: n.is_read as boolean,
    createdAt: n.created_at as string,
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      const mapped = (data ?? []).map(mapRow)
      setNotifications(mapped)
      setUnreadCount(mapped.filter((n) => !n.isRead).length)
    } catch {
      // sessiz hata
    } finally {
      setLoading(false)
    }
  }, [user])

  // Realtime abonelik
  useEffect(() => {
    if (!user) return

    load()

    const channelName = `notifications-full-${user.id}-${Date.now()}`
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = mapRow(payload.new as Record<string, unknown>)
          setNotifications((prev) => [newNotif, ...prev])
          setUnreadCount((prev) => prev + 1)
          // Dışarıdaki dinleyicilere (toast için) bildir
          newNotificationListeners.forEach((cb) => cb(newNotif))
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, load])

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id)
          .eq('user_id', user.id)

        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch {
        // sessiz hata
      }
    },
    [user]
  )

  const markAllRead = useCallback(async () => {
    if (!user) return
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // sessiz hata
    }
  }, [user])

  const onNewNotification = useCallback(
    (cb: (n: AppNotification) => void) => {
      newNotificationListeners.push(cb)
      // Temizlik: caller unmount olursa kaldır
      return () => {
        const idx = newNotificationListeners.indexOf(cb)
        if (idx !== -1) newNotificationListeners.splice(idx, 1)
      }
    },
    []
  )

  return {
    notifications,
    loading,
    unreadCount,
    refresh: load,
    markAsRead,
    markAllRead,
    onNewNotification,
  }
}

// ─────────────────────────────────────────
// Sadece okunmamış sayısı gereken yerler için hafif hook
// ─────────────────────────────────────────
export function useUnreadCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) return

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count: c }) => setCount(c ?? 0))

    const channelName = `notifications-count-${user.id}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .then(({ count: c }) => setCount(c ?? 0))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return count
}
