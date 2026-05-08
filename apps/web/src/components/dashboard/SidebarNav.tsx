'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarRange,
  Users,
  ShieldBan,
  Building2,
  Tag,
  Bell,
  CalendarDays,
  Palmtree,
  ArrowRightLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/auth/getRedirectPath'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/auth/useUser'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
  badgeKey?: 'unreadNotifications'
}

const roleBasePaths: Partial<Record<UserRole, string>> = {
  institution_admin: '/dashboard/admin',
  department_admin: '/dashboard/dept-admin',
  staff: '/dashboard/staff',
}

const navItems: NavItem[] = [
  // ── Shared ──
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['super_admin', 'institution_admin', 'department_admin', 'staff'],
  },

  // ── Admin / Dept-Admin ──
  {
    label: 'Programlar',
    href: '/schedules',
    icon: <CalendarRange className="h-4 w-4" />,
    roles: ['institution_admin', 'department_admin'],
  },
  {
    label: 'Personel',
    href: '/staff',
    icon: <Users className="h-4 w-4" />,
    roles: ['institution_admin', 'department_admin'],
  },
  {
    label: 'Kısıtlar',
    href: '/constraints',
    icon: <ShieldBan className="h-4 w-4" />,
    roles: ['institution_admin', 'department_admin'],
  },
  {
    label: 'Departmanlar',
    href: '/departments',
    icon: <Building2 className="h-4 w-4" />,
    roles: ['institution_admin'],
  },
  {
    label: 'Unvanlar',
    href: '/titles',
    icon: <Tag className="h-4 w-4" />,
    roles: ['institution_admin'],
  },

  // ── Staff ──
  {
    label: 'Programım',
    href: '/schedule',
    icon: <CalendarDays className="h-4 w-4" />,
    roles: ['staff'],
  },
  {
    label: 'İzin Taleplerim',
    href: '/leave',
    icon: <Palmtree className="h-4 w-4" />,
    roles: ['staff'],
  },
  {
    label: 'Takas Taleplerim',
    href: '/swap',
    icon: <ArrowRightLeft className="h-4 w-4" />,
    roles: ['staff'],
  },

  // ── Notifications (all roles with dashboard) ──
  {
    label: 'Bildirimler',
    href: '/notifications',
    icon: <Bell className="h-4 w-4" />,
    roles: ['institution_admin', 'department_admin', 'staff'],
    badgeKey: 'unreadNotifications',
  },
]

interface SidebarNavProps {
  role: UserRole
  onNavigate?: () => void
}

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()
  const { profile } = useUser()
  const [unreadCount, setUnreadCount] = useState(0)

  // Static fetch on mount — no global state / realtime
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const supabase = createClient()
        const { count } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_read', false)

        setUnreadCount(count || 0)
      } catch {
        // silent
      }
    }
    fetchUnread()
  }, [profile.id])

  const filteredItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <nav className="flex flex-col gap-1 px-3">
      {filteredItems.map((item) => {
        // /dashboard stays as-is, relative paths get role prefix
        const resolvedHref = item.href.startsWith('/dashboard')
          ? item.href
          : `${roleBasePaths[role] ?? '/dashboard'}${item.href}`
        const isActive =
          pathname === resolvedHref || pathname.startsWith(resolvedHref + '/')

        const showBadge = item.badgeKey === 'unreadNotifications' && unreadCount > 0

        return (
          <Link
            key={item.href}
            href={resolvedHref}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {showBadge && (
              <span className="flex items-center justify-center min-w-[20px] h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold px-1.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
