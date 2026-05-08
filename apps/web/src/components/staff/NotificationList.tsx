'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/auth/useUser'
import { markAsRead, markAllAsRead } from '@/lib/api/notifications'
import type { NotificationRecord } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'

const typeIcons: Record<string, string> = {
  schedule_published: '📅',
  swap_request: '🔄',
  swap_approved: '✅',
  swap_rejected: '❌',
  leave_approved: '🏖️',
  leave_rejected: '❌',
  shift_changed: '⚠️',
  leave_request: '📋',
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Az önce'
  if (diffMin < 60) return `${diffMin} dk önce`
  if (diffHr < 24) return `${diffHr} saat önce`
  if (diffDay === 1) return 'Dün'
  if (diffDay < 7) return `${diffDay} gün önce`
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function getNotificationLink(n: NotificationRecord): string | null {
  if (!n.related_id) return null
  if (n.type.startsWith('swap')) return '/dashboard/staff/swap'
  if (n.type.startsWith('leave')) return '/dashboard/staff/leave'
  if (n.type === 'schedule_published') return '/dashboard/staff/schedule'
  return null
}

interface NotificationListProps {
  initialNotifications: NotificationRecord[]
}

export function NotificationList({ initialNotifications }: NotificationListProps) {
  const { profile } = useUser()
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationRecord
          setNotifications((prev) => [newNotif, ...prev])
          toast(newNotif.title, {
            description: newNotif.body || undefined,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.id])

  const handleRead = useCallback(async (notification: NotificationRecord) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        )
      } catch {
        // silently fail
      }
    }

    const link = getNotificationLink(notification)
    if (link) router.push(link)
  }, [router])

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      await markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success('Tüm bildirimler okundu olarak işaretlendi')
    } catch {
      toast.error('İşlem başarısız')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Bildirimler</h1>
          {unreadCount > 0 && (
            <Badge className="bg-blue-600 text-white border-0">
              {unreadCount} okunmamış
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            disabled={markingAll}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 mr-2" />
            )}
            Tümünü Okundu İşaretle
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Henüz bildiriminiz yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            return (
              <div
                key={n.id}
                onClick={() => handleRead(n)}
                className={`flex items-start gap-4 rounded-xl p-4 transition-all cursor-pointer border ${
                  n.is_read
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                    : 'bg-blue-500/[0.06] border-blue-500/20 hover:bg-blue-500/10'
                }`}
              >
                {/* Icon */}
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {typeIcons[n.type] || '🔔'}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.is_read ? 'text-slate-300 font-normal' : 'text-white font-semibold'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                </div>

                {/* Time */}
                <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap mt-0.5">
                  {relativeTime(n.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
