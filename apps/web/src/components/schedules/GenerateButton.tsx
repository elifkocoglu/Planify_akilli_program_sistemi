'use client'

import { useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { generateScheduleAPI } from '@/lib/api/schedules'
import type { GenerateScheduleInput } from '@/lib/api/types'

interface GenerateButtonProps {
  scheduleId: string
  onSuccess?: (result: { generatedCount: number; warnings: string[] }) => void
}

export function GenerateButton({ scheduleId, onSuccess }: GenerateButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<Omit<GenerateScheduleInput, 'scheduleId'>>({
    dailySlotCount: 1,
    slotDuration: 480,
    startHour: '08:00',
  })

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generateScheduleAPI({ scheduleId, ...config })
      setOpen(false)
      onSuccess?.({
        generatedCount: result.generatedCount ?? 0,
        warnings: result.warnings ?? [],
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Üretim hatası'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const durationOptions = [
    { value: 240, label: '4 saat' },
    { value: 480, label: '8 saat' },
    { value: 720, label: '12 saat' },
    { value: 1440, label: '24 saat' },
  ]

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
      >
        <Zap className="h-3.5 w-3.5 mr-1.5" />
        Yeniden Üret
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null) }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Otomatik Program Üret</DialogTitle>
            <DialogDescription className="text-slate-400">
              Mevcut slotlar silinip yeniden oluşturulacaktır. Vardiya ayarlarını belirleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">
                Günlük Vardiya Sayısı
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={config.dailySlotCount}
                onChange={(e) => setConfig({ ...config, dailySlotCount: parseInt(e.target.value) || 1 })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">
                Vardiya Süresi
              </label>
              <select
                value={config.slotDuration}
                onChange={(e) => setConfig({ ...config, slotDuration: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              >
                {durationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">
                Başlangıç Saati
              </label>
              <input
                type="time"
                value={config.startHour}
                onChange={(e) => setConfig({ ...config, startHour: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
              <p className="text-sm text-blue-300">
                Günde <strong>{config.dailySlotCount}</strong> vardiya,
                her biri <strong>{durationOptions.find(d => d.value === config.slotDuration)?.label}</strong>,
                ilk vardiya <strong>{config.startHour}</strong>&apos;de başlar
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-slate-400 hover:text-white"
            >
              İptal
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Üretiliyor...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Üret
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
