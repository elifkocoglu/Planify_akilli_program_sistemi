'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateSlot } from '@/lib/api/schedules'
import type { SlotRecord } from '@/lib/api/types'
import type { ValidationResult } from '@planify/shared'

interface StaffOption {
  id: string
  full_name: string
}

interface SlotEditModalProps {
  slot: SlotRecord
  scheduleId: string
  staffList: StaffOption[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function SlotEditModal({
  slot,
  scheduleId,
  staffList,
  open,
  onClose,
  onSaved,
}: SlotEditModalProps) {
  const [staffId, setStaffId] = useState(slot.staff_id)
  const [startTime, setStartTime] = useState(slot.start_time)
  const [endTime, setEndTime] = useState(slot.end_time)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [violations, setViolations] = useState<ValidationResult[]>([])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setViolations([])
    try {
      await updateSlot(scheduleId, slot.id, { staffId, startTime, endTime })
      onSaved()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Güncelleme hatası'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setError(null)
      setViolations([])
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Slot Düzenle</DialogTitle>
          <DialogDescription className="text-slate-400">
            {slot.date} tarihli slotu düzenleyin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-1.5 block">
              Personel
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">
                Başlangıç
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">
                Bitiş
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
            </div>
          </div>
        </div>

        {violations.length > 0 && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-1">
            <p className="text-sm font-medium text-red-400">Kısıt ihlalleri:</p>
            {violations.map((v, i) => (
              <p key={i} className="text-xs text-red-300/70">• {v.message}</p>
            ))}
            <p className="text-xs text-slate-400 mt-2">
              Yine de kaydedebilirsiniz (admin kararı).
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
            className="text-slate-400 hover:text-white"
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Kaydet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
