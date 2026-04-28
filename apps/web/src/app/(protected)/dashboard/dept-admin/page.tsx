'use client'

import { useUser } from '@/lib/auth/useUser'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarRange,
  FileText,
  Users,
  Clock,
  ArrowRightLeft,
  ArrowRight,
  CalendarPlus,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  draftCount: number
  publishedCount: number
  recentSchedules: Array<{
    id: string
    title: string
    status: string
    created_at: string
    departments?: { name: string }
  }>
}

export default function DeptAdminDashboardPage() {
  const { profile } = useUser()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/schedules?status=draft')
        const draftData = await res.json()
        const pubRes = await fetch('/api/schedules?status=published')
        const pubData = await pubRes.json()

        setStats({
          draftCount: draftData.schedules?.length ?? 0,
          publishedCount: pubData.schedules?.length ?? 0,
          recentSchedules: [
            ...(draftData.schedules ?? []),
            ...(pubData.schedules ?? []),
          ]
            .sort((a: { created_at: string }, b: { created_at: string }) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .slice(0, 5),
        })
      } catch {
        setStats({ draftCount: 0, publishedCount: 0, recentSchedules: [] })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: 'Taslak', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    published: { label: 'Yayında', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    archived: { label: 'Arşiv', className: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  }

  const cards = [
    { label: 'Taslak Programlar', value: stats?.draftCount ?? 0, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Yayınlanan Programlar', value: stats?.publishedCount ?? 0, icon: CalendarRange, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hoş Geldiniz, {profile?.full_name?.split(' ')[0] ?? 'Yönetici'}
          </h1>
          <p className="text-slate-400 mt-1">Bölümünüzün program durumuna göz atın.</p>
        </div>
        <Link href="/dashboard/dept-admin/schedules/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <CalendarPlus className="h-4 w-4 mr-2" />
            Yeni Program
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <Skeleton className="h-4 w-20 mb-3 bg-white/10" />
              <Skeleton className="h-8 w-12 bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-400">{card.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent Schedules */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Son Programlar</h2>
          <Link href="/dashboard/dept-admin/schedules">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs">
              Tümünü Gör <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-3">
                <Skeleton className="h-4 w-40 mb-2 bg-white/10" />
                <Skeleton className="h-3 w-24 bg-white/10" />
              </div>
            ))
          ) : stats?.recentSchedules.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500">Henüz program oluşturulmamış</p>
            </div>
          ) : (
            stats?.recentSchedules.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/dept-admin/schedules/${s.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <Badge variant="outline" className={statusConfig[s.status]?.className}>
                  {statusConfig[s.status]?.label ?? s.status}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
