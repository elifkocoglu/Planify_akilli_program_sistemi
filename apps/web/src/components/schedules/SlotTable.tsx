'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SlotEditModal } from './SlotEditModal'
import { deleteSlot } from '@/lib/api/schedules'
import type { SlotRecord } from '@/lib/api/types'

interface StaffOption {
  id: string
  full_name: string
}

interface SlotTableProps {
  slots: SlotRecord[]
  scheduleId: string
  isDraft: boolean
  staffList: StaffOption[]
}

const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

const slotStatusConfig = {
  active: { label: 'Aktif', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  swapped: { label: 'Takas', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  cancelled: { label: 'İptal', className: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

const PAGE_SIZE = 20

export function SlotTable({ slots, scheduleId, isDraft, staffList }: SlotTableProps) {
  const router = useRouter()
  const [page, setPage] = useState(0)
  const [editSlot, setEditSlot] = useState<SlotRecord | null>(null)
  const [filterDay, setFilterDay] = useState<number | 'all'>('all')
  const [filterStaff, setFilterStaff] = useState<string>('all')

  // Filters
  let filtered = slots
  if (filterDay !== 'all') {
    filtered = filtered.filter((s) => s.day_of_week === filterDay)
  }
  if (filterStaff !== 'all') {
    filtered = filtered.filter((s) => s.staff_id === filterStaff)
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleDelete = async (slotId: string) => {
    if (!confirm('Bu slotu silmek istediğinizden emin misiniz?')) return
    try {
      await deleteSlot(scheduleId, slotId)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Silme hatası'
      alert(message)
    }
  }

  const formatDate = (dateStr: string, dow: number) => {
    const d = new Date(dateStr)
    return `${dayNames[dow]}, ${d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  // Unique staff from slots for filter
  const uniqueStaff = Array.from(
    new Map(
      slots
        .filter((s) => s.profiles?.full_name)
        .map((s) => [s.staff_id, { id: s.staff_id, name: s.profiles!.full_name }])
    ).values()
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterDay === 'all' ? 'all' : filterDay.toString()}
          onChange={(e) => {
            setFilterDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
            setPage(0)
          }}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
        >
          <option value="all" className="bg-slate-900">Tüm Günler</option>
          {dayNames.map((name, i) => (
            <option key={i} value={i} className="bg-slate-900">{name}</option>
          ))}
        </select>

        <select
          value={filterStaff}
          onChange={(e) => {
            setFilterStaff(e.target.value)
            setPage(0)
          }}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
        >
          <option value="all" className="bg-slate-900">Tüm Personel</option>
          {uniqueStaff.map((s) => (
            <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
          ))}
        </select>

        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} slot
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Tarih</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Saat</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Personel</th>
                <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">Durum</th>
                {isDraft && (
                  <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">İşlem</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={isDraft ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                    Slot bulunamadı
                  </td>
                </tr>
              ) : (
                paged.map((slot) => {
                  const statusCfg = slotStatusConfig[slot.status]
                  return (
                    <tr key={slot.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-white whitespace-nowrap">
                        {formatDate(slot.date, slot.day_of_week)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          {slot.profiles?.full_name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusCfg.className}>
                          {statusCfg.label}
                        </Badge>
                      </td>
                      {isDraft && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setEditSlot(slot)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDelete(slot.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500">
            Sayfa {page + 1} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="text-slate-400 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSlot && (
        <SlotEditModal
          slot={editSlot}
          scheduleId={scheduleId}
          staffList={staffList}
          open={!!editSlot}
          onClose={() => setEditSlot(null)}
          onSaved={() => {
            setEditSlot(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
