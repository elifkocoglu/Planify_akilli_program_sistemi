'use client'

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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/auth/getRedirectPath'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
}

const roleBasePaths: Partial<Record<UserRole, string>> = {
  institution_admin: '/dashboard/admin',
  department_admin: '/dashboard/dept-admin',
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['super_admin', 'institution_admin', 'department_admin', 'staff'],
  },
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
  {
    label: 'Bildirimler',
    href: '/notifications',
    icon: <Bell className="h-4 w-4" />,
    roles: ['institution_admin', 'department_admin'],
  },
]

interface SidebarNavProps {
  role: UserRole
  onNavigate?: () => void
}

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname()

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
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
