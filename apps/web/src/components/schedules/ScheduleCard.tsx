'use client'

import Link from 'next/link'
import { Calendar, Clock, Users, MoreVertical, Pencil, Trash2, Eye, Send, Archive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ScheduleRecord } from '@/lib/api/types'

const statusConfig = {
  draft: { label: 'Taslak', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  published: { label: 'Yayında', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  archived: { label: 'Arşiv', className: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
}

const typeConfig = {
  duty: { label: 'Nöbet', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  lesson: { label: 'Ders', className: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
}

interface ScheduleCardProps {
  schedule: ScheduleRecord
  basePath: string
  onPublish?: (id: string) => void
  onDelete?: (id: string) => void
  onArchive?: (id: string) => void
}

export function ScheduleCard({ schedule, basePath, onPublish, onDelete, onArchive }: ScheduleCardProps) {
  const status = statusConfig[schedule.status]
  const type = typeConfig[schedule.type]
  const departmentName = schedule.departments?.name ?? 'Departman'

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`${basePath}/schedules/${schedule.id}`}
            className="text-base font-semibold text-white hover:text-blue-400 transition-colors line-clamp-1"
          >
            {schedule.title}
          </Link>
          <p className="text-sm text-slate-400 mt-0.5">{departmentName}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="outline" className={type.className}>
            {type.label}
          </Badge>
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(schedule.start_date)} — {formatDate(schedule.end_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {schedule.period_type === 'weekly' ? 'Haftalık' : 'Aylık'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
        {schedule.status === 'draft' && (
          <>
            <Link href={`${basePath}/schedules/${schedule.id}`}>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Düzenle
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => onPublish?.(schedule.id)}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Yayınla
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
              onClick={() => onDelete?.(schedule.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Sil
            </Button>
          </>
        )}
        {schedule.status === 'published' && (
          <>
            <Link href={`${basePath}/schedules/${schedule.id}`}>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                Görüntüle
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white ml-auto"
              onClick={() => onArchive?.(schedule.id)}
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Arşivle
            </Button>
          </>
        )}
        {schedule.status === 'archived' && (
          <Link href={`${basePath}/schedules/${schedule.id}`}>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Görüntüle
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
