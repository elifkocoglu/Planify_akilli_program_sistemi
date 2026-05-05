'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Pencil, Plus, Trash2, CalendarDays, Clock, BarChart3 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { StaffCard } from '@/components/staff/StaffCard'
import { StaffStatusBadge } from '@/components/staff/StaffStatusBadge'
import { getStaffDetail, toggleStaffStatus } from '@/lib/api/staff'
import { deleteConstraint } from '@/lib/api/constraints'
import type { StaffDetailResponse, ConstraintRecord } from '@/lib/api/types'

// Kısıt tipi etiketleri
const constraintTypeLabels: Record<string, string> = {
  max_shifts_per_week: 'Haftada Max Nöbet',
  max_shifts_per_month: 'Ayda Max Nöbet',
  max_hours_per_week: 'Haftalık Max Saat',
  min_rest_hours: 'Min Dinlenme',
  no_consecutive_days: 'Ardışık Gün Yasağı',
  unavailable_day: 'Müsait Olmayan Gün',
  unavailable_date: 'Müsait Olmayan Tarih',
  unavailable_time: 'Müsait Olmayan Saat',
  required_title_per_shift: 'Zorunlu Unvan',
  min_staff_per_shift: 'Min Personel',
  max_staff_per_shift: 'Max Personel',
  not_together_shift: 'Birlikte Olamaz',
  must_together_shift: 'Birlikte Olmalı',
  teacher_no_overlap: 'Öğretmen Çakışma',
  class_no_overlap: 'Sınıf Çakışma',
}

const leaveStatusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: 'Bekliyor', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  approved: { label: 'Onaylandı', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Reddedildi', className: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

const leaveTypeLabels: Record<string, string> = {
  annual: 'Yıllık İzin',
  sick: 'Hastalık İzni',
  unpaid: 'Ücretsiz İzin',
  maternity: 'Doğum İzni',
  administrative: 'İdari İzin',
}

export default function AdminStaffDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [data, setData] = useState<StaffDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const result = await getStaffDetail(params.id)
      setData(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Personel bilgisi alınamadı')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const handleToggle = async () => {
    if (!data?.staff) return
    try {
      setToggling(true)
      await toggleStaffStatus(params.id, !data.staff.is_active)
      toast.success(data.staff.is_active ? 'Personel pasif yapıldı' : 'Personel aktif yapıldı')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'İşlem başarısız')
    } finally {
      setToggling(false)
    }
  }

  const handleDeleteConstraint = async (constraintId: string) => {
    try {
      await deleteConstraint(constraintId)
      toast.success('Kısıt silindi')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kısıt silinemedi')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40 bg-white/10" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 bg-white/10" />
          <Skeleton className="h-80 bg-white/10" />
          <Skeleton className="h-80 bg-white/10" />
        </div>
      </div>
    )
  }

  if (!data?.staff) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Personel bulunamadı</p>
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="text-blue-400 mt-2"
        >
          Geri Dön
        </Button>
      </div>
    )
  }

  const { staff, slotStats, constraints, upcomingSlots, leaveRequests, swapRequests } = data
  const maxBarValue = Math.max(...(slotStats?.monthlyHistory?.map((m) => m.count) ?? [1]), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Geri
        </Button>
        <h1 className="text-xl font-bold text-white">Personel Detay</h1>
      </div>

      {/* 3-Column Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Profile Card */}
        <StaffCard
          staff={staff}
          onEdit={() => router.push(`/dashboard/admin/staff/${params.id}/edit`)}
          onToggleStatus={handleToggle}
          isToggling={toggling}
        />

        {/* MIDDLE: Slot Statistics */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            Nöbet İstatistikleri
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-white">{slotStats?.thisWeek ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Bu Hafta</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-white">
                {slotStats?.thisMonth ?? 0}
                {staff.monthly_max_shifts && (
                  <span className="text-sm text-slate-500">/{staff.monthly_max_shifts}</span>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">Bu Ay</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-white">{slotStats?.thisMonthHours ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Saat</p>
            </div>
          </div>

          {/* CSS Bar Chart — Son 3 Ay */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Son 3 Ay</p>
            <div className="flex items-end gap-3 h-24">
              {slotStats?.monthlyHistory?.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-white">{m.count}</span>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                    style={{
                      height: `${maxBarValue > 0 ? (m.count / maxBarValue) * 100 : 0}%`,
                      minHeight: m.count > 0 ? '4px' : '2px',
                    }}
                  />
                  <span className="text-xs text-slate-500">{m.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Constraints */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Kısıtlar</h3>
            <Link href={`/dashboard/admin/constraints/new?staffId=${params.id}`}>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 h-7 px-2">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ekle
              </Button>
            </Link>
          </div>

          {constraints && constraints.length > 0 ? (
            <div className="space-y-2">
              {constraints.map((c: ConstraintRecord) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                >
                  <div className="flex-1 min-w-0">
                    <Badge
                      variant="outline"
                      className="bg-violet-500/15 text-violet-400 border-violet-500/20 text-xs"
                    >
                      {constraintTypeLabels[c.type] ?? c.type}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {JSON.stringify(c.value)}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 h-7 w-7 p-0 flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Kısıtı Sil</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          Bu kısıtı silmek istediğinizden emin misiniz?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                          İptal
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteConstraint(c.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Sil
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">Henüz kısıt eklenmemiş</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="upcoming" className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <TabsList className="bg-transparent border-b border-white/[0.06] rounded-none w-full justify-start px-4 pt-2">
          <TabsTrigger
            value="upcoming"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 text-slate-400 rounded-lg"
          >
            <CalendarDays className="h-3.5 w-3.5 mr-2" />
            Yaklaşan Nöbetler
          </TabsTrigger>
          <TabsTrigger
            value="leaves"
            className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 text-slate-400 rounded-lg"
          >
            <Clock className="h-3.5 w-3.5 mr-2" />
            İzin Talepleri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="p-4">
          {upcomingSlots && upcomingSlots.length > 0 ? (
            <div className="space-y-2">
              {upcomingSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {new Date(slot.date).toLocaleDateString('tr-TR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {slot.start_time} - {slot.end_time}
                    </p>
                  </div>
                  <StaffStatusBadge isActive={slot.status === 'active'} />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">Yaklaşan nöbet bulunamadı</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaves" className="p-4">
          {leaveRequests && leaveRequests.length > 0 ? (
            <div className="space-y-2">
              {leaveRequests.map((lr) => {
                const statusConf = leaveStatusLabels[lr.status]
                return (
                  <div
                    key={lr.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {leaveTypeLabels[lr.type] ?? lr.type}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(lr.start_date).toLocaleDateString('tr-TR')} -{' '}
                        {new Date(lr.end_date).toLocaleDateString('tr-TR')}
                      </p>
                      {lr.reason && (
                        <p className="text-xs text-slate-500 mt-1">{lr.reason}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={statusConf?.className}>
                      {statusConf?.label ?? lr.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">İzin talebi bulunamadı</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
