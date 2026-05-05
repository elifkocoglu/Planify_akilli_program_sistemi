'use client'

import { Badge } from '@/components/ui/badge'

interface StaffStatusBadgeProps {
  isActive: boolean
}

export function StaffStatusBadge({ isActive }: StaffStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
          : 'bg-red-500/15 text-red-400 border-red-500/20'
      }
    >
      {isActive ? 'Aktif' : 'Pasif'}
    </Badge>
  )
}

const roleLabels: Record<string, { label: string; className: string }> = {
  super_admin: {
    label: 'Süper Admin',
    className: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  },
  institution_admin: {
    label: 'Kurum Yöneticisi',
    className: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  },
  department_admin: {
    label: 'Bölüm Yöneticisi',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  },
  staff: {
    label: 'Personel',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  },
}

interface RoleBadgeProps {
  role: string
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleLabels[role] ?? {
    label: role,
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  }
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
