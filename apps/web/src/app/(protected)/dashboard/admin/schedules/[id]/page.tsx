'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Zap,
  Send,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SlotTable } from '@/components/schedules/SlotTable'
import { UnresolvedAlert } from '@/components/schedules/UnresolvedAlert'
import { GenerateButton } from '@/components/schedules/GenerateButton'
import { PublishButton } from '@/components/schedules/PublishButton'
import { addSlot } from '@/lib/api/schedules'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { ScheduleRecord, SlotRecord } from '@/lib/api/types'
import type { UnresolvedSlot } from '@planify/shared'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Taslak', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  published: { label: 'Yayında', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  archived: { label: 'Arşiv', className: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
}

interface StaffOption {
  id: string
  full_name: string
}

export default function ScheduleDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params
  const [schedule, setSchedule] = useState<ScheduleRecord | null>(null)
  const [slots, setSlots] = useState<SlotRecord[]>([])
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [unresolved, setUnresolved] = useState<UnresolvedSlot[]>([])

  // Add slot dialog
  const [addSlotOpen, setAddSlotOpen] = useState(false)
  const [newSlot, setNewSlot] = useState({ staffId: '', date: '', startTime: '08:00', endTime: '16:00' })
  const [addSlotLoading, setAddSlotLoading] = useState(false)
  const [addSlotError, setAddSlotError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/schedules/${id}`)
        const data = await res.json()
        if (data.success) {
          setSchedule(data.schedule)
          setSlots(data.slots ?? [])

          // Extract unique staff from slots
          const staffMap = new Map<string, StaffOption>()
          for (const slot of data.slots ?? []) {
            if (slot.profiles?.full_name) {
              staffMap.set(slot.staff_id, { id: slot.staff_id, full_name: slot.profiles.full_name })
            }
          }
          setStaffList(Array.from(staffMap.values()))
        }
      } catch {
        // Error handled by empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleAddSlot = async () => {
    if (!newSlot.staffId || !newSlot.date) return
    setAddSlotLoading(true)
    setAddSlotError(null)
    try {
      await addSlot(id, {
        staffId: newSlot.staffId,
        date: newSlot.date,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
      })
      setAddSlotOpen(false)
      setNewSlot({ staffId: '', date: '', startTime: '08:00', endTime: '16:00' })
      router.refresh()
      // Reload data
      const res = await fetch(`/api/schedules/${id}`)
      const data = await res.json()
      if (data.success) {
        setSlots(data.slots ?? [])
      }
    } catch (err: unknown) {
      setAddSlotError(err instanceof Error ? err.message : 'Slot eklenemedi')
    } finally {
      setAddSlotLoading(false)
    }
  }

  const isDraft = schedule?.status === 'draft'

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30'

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-white/10" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28 bg-white/10" />
          <Skeleton className="h-9 w-28 bg-white/10" />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-white/10" />
          ))}
        </div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-slate-400">Program bulunamadı</p>
        <Link href="/dashboard/admin/schedules">
          <Button variant="ghost" className="mt-4 text-blue-400">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
        </Link>
      </div>
    )
  }

  const statusCfg = statusConfig[schedule.status]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin/schedules">
            <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{schedule.title}</h1>
              <Badge variant="outline" className={statusCfg.className}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {schedule.departments?.name ?? 'Departman'} · {formatDate(schedule.start_date)} — {formatDate(schedule.end_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/dashboard/admin/schedules/${id}/calendar`}>
            <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Takvim
            </Button>
          </Link>

          {isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-slate-300 hover:text-white"
                onClick={() => setAddSlotOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Slot Ekle
              </Button>

              <GenerateButton
                scheduleId={id}
                onSuccess={async (result) => {
                  if (result.warnings.length > 0) {
                    alert(result.warnings.join('\n'))
                  }
                  // Reload
                  const res = await fetch(`/api/schedules/${id}`)
                  const data = await res.json()
                  if (data.success) {
                    setSlots(data.slots ?? [])
                  }
                }}
              />

              <PublishButton scheduleId={id} />
            </>
          )}
        </div>
      </div>

      {/* Unresolved Alert */}
      <UnresolvedAlert unresolved={unresolved} />

      {/* Slot stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-400">
          Toplam: <strong className="text-white">{slots.filter((s) => s.status === 'active').length}</strong> aktif slot
        </span>
      </div>

      {/* Slot Table */}
      <SlotTable
        slots={slots.filter((s) => s.status !== 'cancelled')}
        scheduleId={id}
        isDraft={isDraft}
        staffList={staffList}
      />

      {/* Add Slot Dialog */}
      <Dialog open={addSlotOpen} onOpenChange={(v) => { setAddSlotOpen(v); setAddSlotError(null) }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Manuel Slot Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Personel</label>
              <select
                value={newSlot.staffId}
                onChange={(e) => setNewSlot({ ...newSlot, staffId: e.target.value })}
                className={inputClass}
              >
                <option value="" className="bg-slate-900">Seçiniz...</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">{s.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Tarih</label>
              <input type="date" value={newSlot.date} onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Başlangıç</label>
                <input type="time" value={newSlot.startTime} onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Bitiş</label>
                <input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })} className={inputClass} />
              </div>
            </div>
          </div>
          {addSlotError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-400">{addSlotError}</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setAddSlotOpen(false)} className="text-slate-400 hover:text-white">
              İptal
            </Button>
            <Button onClick={handleAddSlot} disabled={addSlotLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {addSlotLoading ? 'Ekleniyor...' : 'Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
