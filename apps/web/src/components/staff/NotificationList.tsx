'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/auth/useUser'
import type { NotificationRecord } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bell,
  CheckCheck,
  Loader2,
  CalendarDays,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Palmtree,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react'

// ─── Tip → İkon + Renk ───────────────────────────────────────

type IconConfig = {
  icon: React.ReactNode
  bg: string
  text: string
}

function getIconConfig(type: string): IconConfig {
  switch (type) {
    case 'schedule_published':
      return {
        icon: <CalendarDays className="w-5 h-5" />,
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
      }
    case 'swap_request':
      return {
        icon: <ArrowLeftRight className="w-5 h-5" />,
        bg: 'bg-orange-500/20',
        text: 'text-orange-400',
      }
    case 'swap_approved':
      return {
        icon: <CheckCircle2 className="w-5 h-5" />,
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
      }
    case 'swap_rejected':
      return {
        icon: <XCircle className="w-5 h-5" />,
        bg: 'bg-red-500/20',
        text: 'text-red-400',
      }
    case 'leave_approved':
      return {
        icon: <Palmtree className="w-5 h-5" />,
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
      }
    case 'leave_rejected':
      return {
        icon: <XCircle className="w-5 h-5" />,
        bg: 'bg-red-500/20',
        text: 'text-red-400',
      }
    case 'shift_changed':
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
      }
    case 'leave_request':
      return {
        icon: <ClipboardList className="w-5 h-5" />,
        bg: 'bg-violet-500/20',
        text: 'text-violet-400',
      }
    default:
      return {
        icon: <Bell className="w-5 h-5" />,
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
      }
  }
}

// ─── Göreceli Zaman ──────────────────────────────────────────

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
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
  })
}

// ─── Navigasyon Yardımcısı ───────────────────────────────────

function getNotificationLink(
  n: NotificationRecord,
  role: string
): string | null {
  const isAdmin =
    role === 'institution_admin' || role === 'department_admin'

  switch (n.type) {
    case 'schedule_published':
      return isAdmin
        ? '/dashboard/admin/schedules'
        : '/dashboard/staff/schedule'
    case 'swap_request':
    case 'swap_approved':
    case 'swap_rejected':
      return isAdmin ? '/dashboard/admin/swap' : '/dashboard/staff/swap'
    case 'leave_approved':
    case 'leave_rejected':
    case 'leave_request':
      return isAdmin
        ? '/dashboard/admin/staff'
        : '/dashboard/staff/leave'
    case 'shift_changed':
      return isAdmin
        ? '/dashboard/admin/schedules'
        : '/dashboard/staff/schedule'
    default:
      return null
  }
}

// ─── Loading Skeleton ─────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-xl p-4 border border-white/5 bg-white/[0.02]"
        >
          <Skeleton className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 bg-white/10" />
            <Skeleton className="h-3 w-1/2 bg-white/10" />
          </div>
          <Skeleton className="h-3 w-16 bg-white/10 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ─── Ana Bileşen ─────────────────────────────────────────────

interface NotificationListProps {
  initialNotifications?: NotificationRecord[]
}

export function NotificationList({
  initialNotifications,
}: NotificationListProps) {
  const { profile } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const isOnNotificationsPage = pathname?.includes('/notifications')

  const [notifications, setNotifications] = useState<NotificationRecord[]>(
    initialNotifications ?? []
  )
  const [loading, setLoading] = useState(!initialNotifications)
  const [markingAll, setMarkingAll] = useState(false)

  // initialNotifications yoksa client-side fetch yap
  useEffect(() => {
    if (initialNotifications) return
    const supabase = createClient()
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications((data as NotificationRecord[]) ?? [])
        setLoading(false)
      })
  }, [profile.id, initialNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`web-notifications-${profile.id}`)
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

          // Bildirim sayfasındayken toast gösterme
          if (!isOnNotificationsPage) {
            const cfg = getIconConfig(newNotif.type)
            toast(newNotif.title, {
              description: newNotif.body || undefined,
              duration: 4000,
              icon: (
                <span className={cfg.text}>
                  {cfg.icon}
                </span>
              ),
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.id, isOnNotificationsPage])

  const handleRead = useCallback(
    async (notification: NotificationRecord) => {
      if (!notification.is_read) {
        try {
          await fetch(`/api/notifications/${notification.id}/read`, {
            method: 'PATCH',
          })
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          )
        } catch {
          // sessizce geç
        }
      }

      const link = getNotificationLink(notification, profile.role)
      if (link) router.push(link)
    },
    [router, profile.role]
  )

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        toast.success('Tüm bildirimler okundu olarak işaretlendi')
      }
    } catch {
      toast.error('İşlem başarısız')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Bildirimler</h1>
          {unreadCount > 0 && (
            <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-0">
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
            className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
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

      {/* Content */}
      {loading ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        /* Boş durum */
        <div className="rounded-xl border border-white/10 bg-white/[0.02] py-20 text-center">
          <Bell className="w-14 h-14 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Henüz bildiriminiz yok</p>
          <p className="text-slate-600 text-sm mt-1">
            Yeni bildirimler burada görünecek
          </p>
        </div>
      ) : (
        /* Bildirim listesi */
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          {notifications.map((n, idx) => {
            const cfg = getIconConfig(n.type)
            return (
              <div key={n.id}>
                <div
                  onClick={() => handleRead(n)}
                  className={`flex items-start gap-4 px-4 py-4 transition-all cursor-pointer group ${
                    n.is_read
                      ? 'hover:bg-white/[0.03]'
                      : 'bg-blue-500/[0.05] hover:bg-blue-500/[0.08]'
                  }`}
                >
                  {/* İkon */}
                  <div
                    className={`w-10 h-10 rounded-full ${cfg.bg} ${cfg.text} flex items-center justify-center flex-shrink-0 mt-0.5`}
                  >
                    {cfg.icon}
                  </div>

                  {/* İçerik */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-snug ${
                        n.is_read
                          ? 'text-slate-300 font-normal'
                          : 'text-white font-semibold'
                      }`}
                    >
                      {n.title}
                      {!n.is_read && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 ml-2 mb-0.5 align-middle" />
                      )}
                    </p>
                    {n.body && (
                      <p className="text-sm text-slate-500 mt-0.5 truncate">
                        {n.body}
                      </p>
                    )}
                  </div>

                  {/* Zaman */}
                  <span className="text-xs text-slate-600 group-hover:text-slate-500 flex-shrink-0 whitespace-nowrap mt-0.5 transition-colors">
                    {relativeTime(n.created_at)}
                  </span>
                </div>
                {idx < notifications.length - 1 && (
                  <Separator className="bg-white/[0.04]" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
