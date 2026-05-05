'use client'

import { Pencil, UserX, UserCheck, Mail, Building2, Tag, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StaffStatusBadge, RoleBadge } from './StaffStatusBadge'
import type { StaffRecord } from '@/lib/api/types'

const avatarColors = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-violet-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface StaffCardProps {
  staff: StaffRecord
  email?: string
  onEdit: () => void
  onToggleStatus: () => void
  isToggling?: boolean
}

export function StaffCard({ staff, onEdit, onToggleStatus, isToggling }: StaffCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
      {/* Avatar + Name */}
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarColor(
            staff.full_name
          )} flex items-center justify-center text-xl font-bold text-white mb-3`}
        >
          {getInitials(staff.full_name)}
        </div>
        <h2 className="text-lg font-bold text-white">{staff.full_name}</h2>
        <div className="flex items-center gap-2 mt-2">
          <RoleBadge role={staff.role} />
          <StaffStatusBadge isActive={staff.is_active} />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <span className="text-slate-300 truncate">{staff.id}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <span className="text-slate-300">{staff.departments?.name ?? 'Atanmamış'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Tag className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <span className="text-slate-300">{staff.titles?.name ?? 'Atanmamış'}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <span className="text-slate-300">
            {new Date(staff.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
        <Button
          onClick={onEdit}
          variant="outline"
          size="sm"
          className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Düzenle
        </Button>
        <Button
          onClick={onToggleStatus}
          variant="outline"
          size="sm"
          disabled={isToggling}
          className={`flex-1 ${
            staff.is_active
              ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
              : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
          } bg-transparent`}
        >
          {staff.is_active ? (
            <>
              <UserX className="h-3.5 w-3.5 mr-2" />
              Pasif Et
            </>
          ) : (
            <>
              <UserCheck className="h-3.5 w-3.5 mr-2" />
              Aktif Et
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
