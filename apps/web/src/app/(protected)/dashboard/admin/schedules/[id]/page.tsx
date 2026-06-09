'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Archive,
  Brain,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIAnalysisReport } from '@/components/schedules/AIAnalysisReport'
import { SlotTable } from '@/components/schedules/SlotTable'
import { UnresolvedAlert } from '@/components/schedules/UnresolvedAlert'
import { GenerateButton } from '@/components/schedules/GenerateButton'
import { PublishButton } from '@/components/schedules/PublishButton'
import { addSlot, deleteSchedule, updateSchedule } from '@/lib/api/schedules'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ScheduleRecord, SlotRecord } from '@/lib/api/types'
import type { UnresolvedSlot } from '@planify/shared'
import { parseLocalDate } from '@/lib/utils/date'

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
  const [unresolved] = useState<UnresolvedSlot[]>([])

  // AI Analizi
  const [manualAnalysisLoading, setManualAnalysisLoading] = useState(false)
  const [addSlotOpen, setAddSlotOpen] = useState(false)
  const [newSlot, setNewSlot] = useState({ staffId: '', date: '', startTime: '08:00', endTime: '16:00' })
  const [addSlotLoading, setAddSlotLoading] = useState(false)
  const [addSlotError, setAddSlotError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleArchive = async () => {
    try {
      await updateSchedule(id, { status: 'archived' })
      toast.success('Program arşivlendi')
      router.refresh()
      const res = await fetch(`/api/schedules/${id}`)
      const data = await res.json()
      if (data.success) {
        setSchedule(data.schedule)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Arşivleme hatası')
    }
  }

  const handleManualAnalysis = async () => {
    setManualAnalysisLoading(true)
    try {
       const constraintsRes = await fetch(`/api/constraints?departmentId=${schedule?.department_id}`)
       const constraintsData = await constraintsRes.json()
       
       const apiSlots = slots.map(s => ({
         staffId: s.staff_id,
         date: s.date,
         startTime: s.start_time,
         endTime: s.end_time
       }))
  
       const aiRes = await fetch('/api/ai/analyze-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduleId: id,
            slots: apiSlots,
            unresolved: unresolved,
            warnings: [],
            staffList: staffList.map(s => ({ id: s.id, fullName: s.full_name })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            constraints: constraintsData.constraints?.map((c: any) => ({
              staffId: c.staff_id,
              type: c.type,
              value: c.value
            })) || [],
            dateRange: { start: schedule?.start_date, end: schedule?.end_date },
            scheduleType: schedule?.type
          })
       })
       const data = await aiRes.json()
       if (data.success) {
         toast.success("AI Analizi başarıyla tamamlandı")
         const updatedSchedule = { 
           ...schedule!, 
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           settings: { ...((schedule as any).settings || {}), aiAnalysis: data.analysis } 
         } as ScheduleRecord
         setSchedule(updatedSchedule)
       } else {
         throw new Error(data.error)
       }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || 'Analiz başarısız oldu')
    } finally {
      setManualAnalysisLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteSchedule(id)
      toast.success('Program silindi')
      router.push('/dashboard/admin/schedules')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Silme hatası')
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  const isDraft = schedule?.status === 'draft'

  const formatDate = (d: string) =>
    parseLocalDate(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })

  const calculateStaffStats = () => {
    return staffList.map(staff => {
      const staffSlots = slots.filter(s => s.staff_id === staff.id && s.status === 'active')
      const totalHours = staffSlots.reduce((acc, slot) => {
        const [sh, sm] = slot.start_time.split(':').map(Number)
        const [eh, em] = slot.end_time.split(':').map(Number)
        let diff = (eh * 60 + em) - (sh * 60 + sm)
        if (diff <= 0) diff += 24 * 60
        return acc + diff / 60
      }, 0)

      return {
        id: staff.id,
        fullName: staff.full_name,
        shiftCount: staffSlots.length,
        totalHours: Math.round(totalHours * 10) / 10,
      }
    })
  }

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

              <PublishButton scheduleId={id} onSuccess={() => {
                router.refresh()
                window.location.reload()
              }} />
            </>
          )}

          {schedule.status === 'published' && (
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 text-slate-300 hover:text-white"
              onClick={handleArchive}
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Arşivle
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Sil
          </Button>
        </div>
      </div>

      <Tabs defaultValue="slots" className="w-full">
        <TabsList className="bg-white/[0.02] border border-white/10 p-1 rounded-xl mb-6">
          <TabsTrigger value="slots" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
            Slotlar
          </TabsTrigger>
          <TabsTrigger value="analysis" className="rounded-lg data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 text-slate-400 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            🤖 AI Analizi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slots" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(schedule as any).settings?.aiAnalysis ? (
            <AIAnalysisReport 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              analysis={(schedule as any).settings.aiAnalysis} 
              staffStats={calculateStaffStats()}
              unresolvedCount={unresolved.length}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-white/10 rounded-xl bg-white/[0.02] border-dashed">
              <Brain className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">AI Analizi Bulunmuyor</h3>
              <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                Bu program için henüz yapay zeka analizi yapılmamış veya analiz verisi güncel değil. Şimdi analiz başlatabilirsiniz.
              </p>
              <Button onClick={handleManualAnalysis} disabled={manualAnalysisLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                {manualAnalysisLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                {manualAnalysisLoading ? 'Analiz Ediliyor...' : 'Yapay Zeka ile Analiz Et'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Programı Sil</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {schedule.status === 'published'
                ? 'Bu yayınlanan programı silmek istediğinizden emin misiniz? Tüm nöbet/ders kayıtları silinecek ve personel bilgilendirilecektir.'
                : schedule.status === 'draft'
                ? 'Bu taslak programı silmek istediğinizden emin misiniz?'
                : 'Bu arşivlenmiş programı kalıcı olarak silmek istediğinizden emin misiniz?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="bg-transparent border-white/10 hover:bg-white/5 hover:text-white">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
            >
              {isDeleting ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
