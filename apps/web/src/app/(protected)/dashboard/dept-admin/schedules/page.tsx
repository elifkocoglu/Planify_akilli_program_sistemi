'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarPlus, CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScheduleList } from '@/components/schedules/ScheduleList'
import { getSchedules } from '@/lib/api/schedules'
import type { ScheduleRecord } from '@/lib/api/types'

const statusTabs = [
  { value: 'all', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'published', label: 'Yayında' },
  { value: 'archived', label: 'Arşiv' },
]

export default function DeptAdminSchedulesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([])
  const [loading, setLoading] = useState(true)

  const statusFilter = searchParams.get('status') ?? 'all'

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const result = await getSchedules(
          statusFilter !== 'all' ? { status: statusFilter as 'draft' | 'published' | 'archived' } : undefined
        )
        setSchedules(result.schedules ?? [])
      } catch {
        setSchedules([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [statusFilter])

  const setStatus = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'all') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    router.push(`/dashboard/dept-admin/schedules?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <CalendarRange className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Bölüm Programları
              {!loading && (
                <Badge variant="outline" className="bg-white/5 text-slate-400 border-white/10 text-xs">
                  {schedules.length}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-slate-400">Departmanınızın programlarını yönetin</p>
          </div>
        </div>
        <Link href="/dashboard/dept-admin/schedules/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <CalendarPlus className="h-4 w-4 mr-2" />
            Yeni Program
          </Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06] w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              statusFilter === tab.value
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
              <Skeleton className="h-5 w-3/4 bg-white/10" />
              <Skeleton className="h-4 w-1/2 bg-white/10" />
              <Skeleton className="h-3 w-full bg-white/10" />
              <Skeleton className="h-8 w-24 bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <ScheduleList schedules={schedules} basePath="/dashboard/dept-admin" />
      )}
    </div>
  )
}
