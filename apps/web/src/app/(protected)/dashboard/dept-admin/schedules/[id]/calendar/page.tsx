'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarView } from '@/components/schedules/CalendarView'
import type { ScheduleRecord, SlotRecord } from '@/lib/api/types'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Taslak', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  published: { label: 'Yayında', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  archived: { label: 'Arşiv', className: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
}

interface StaffOption {
  id: string
  full_name: string
}

export default function DeptAdminScheduleCalendarPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [schedule, setSchedule] = useState<ScheduleRecord | null>(null)
  const [slots, setSlots] = useState<SlotRecord[]>([])
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/schedules/${id}`)
        const data = await res.json()
        if (data.success) {
          setSchedule(data.schedule)
          setSlots(data.slots ?? [])
          const staffMap = new Map<string, StaffOption>()
          for (const slot of data.slots ?? []) {
            if (slot.profiles?.full_name) {
              staffMap.set(slot.staff_id, { id: slot.staff_id, full_name: slot.profiles.full_name })
            }
          }
          setStaffList(Array.from(staffMap.values()))
        }
      } catch {
        // error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-white/10" />
        <Skeleton className="h-[400px] w-full bg-white/10 rounded-xl" />
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-slate-400">Program bulunamadı</p>
      </div>
    )
  }

  const statusCfg = statusConfig[schedule.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/dept-admin/schedules/${id}`}>
            <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{schedule.title}</h1>
              <Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">Takvim Görünümü</p>
          </div>
        </div>
        <Link href={`/dashboard/dept-admin/schedules/${id}`}>
          <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white">
            <List className="h-3.5 w-3.5 mr-1.5" />
            Liste Görünümü
          </Button>
        </Link>
      </div>

      {/* Calendar */}
      <CalendarView
        slots={slots}
        scheduleId={id}
        isDraft={schedule.status === 'draft'}
        staffList={staffList}
        startDate={schedule.start_date}
        endDate={schedule.end_date}
      />
    </div>
  )
}
