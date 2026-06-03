'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useUser } from '@/lib/auth/useUser'
import { SidebarNav } from './SidebarNav'
import { MobileSidebar } from './MobileSidebar'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/auth/getRedirectPath'

const roleLabels: Record<string, string> = {
  super_admin: 'Süper Admin',
  institution_admin: 'Kurum Yöneticisi',
  department_admin: 'Bölüm Yöneticisi',
  staff: 'Personel',
}

/** Role'e göre bildirim sayfası URL'i */
function getNotificationsPath(role: UserRole): string {
  if (role === 'institution_admin') return '/dashboard/admin/notifications'
  if (role === 'department_admin') return '/dashboard/dept-admin/notifications'
  return '/dashboard/staff/notifications'
}

/** Header'da okunmamış bildirim sayısını gösteren bell ikonu */
function NotificationBell({ role }: { role: UserRole }) {
  const { profile } = useUser()
  const router = useRouter()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    // İlk yükleme
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
      setUnread(count ?? 0)
    }
    fetchUnread()

    // Realtime — yeni INSERT → count arttır
    const channel = supabase
      .channel(`bell-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => setUnread((prev) => prev + 1)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          // Okundu işaretlenince yeniden say
          fetchUnread()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.id])

  return (
    <button
      onClick={() => router.push(getNotificationsPath(role))}
      className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      aria-label="Bildirimler"
      id="header-notifications-bell"
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile } = useUser()

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/10 bg-slate-900/50 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Planify</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav role={profile.role} />
        </div>

        {/* User info at bottom */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
              {profile.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile.full_name ?? 'Kullanıcı'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {roleLabels[profile.role] ?? profile.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 bg-slate-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <MobileSidebar role={profile.role} />
            {/* Logo (mobile) */}
            <span className="font-bold text-white md:hidden">Planify</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-sm font-medium text-white leading-none">
                {profile.full_name ?? 'Kullanıcı'}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">
                {roleLabels[profile.role] ?? profile.role}
              </span>
            </div>
            {/* 🔔 Bildirim zili */}
            <NotificationBell role={profile.role} />
            <SignOutButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
