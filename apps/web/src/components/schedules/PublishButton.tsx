'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { publishSchedule } from '@/lib/api/schedules'

interface PublishButtonProps {
  scheduleId: string
  /** true ise buton yerine doğrudan dialog açılır */
  autoOpen?: boolean
  onClose?: () => void
  onSuccess?: () => void
}

export function PublishButton({ scheduleId, autoOpen, onClose, onSuccess }: PublishButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(autoOpen ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await publishSchedule(scheduleId)
      setOpen(false)
      onSuccess?.()
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Yayınlama hatası'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      setError(null)
      onClose?.()
    }
  }

  return (
    <>
      {!autoOpen && (
        <Button
          onClick={() => setOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          size="sm"
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Yayınla
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Programı Yayınla</DialogTitle>
            <DialogDescription className="text-slate-400">
              Bu programı yayınlamak istediğinizden emin misiniz?
              Tüm departman personeline bildirim gönderilecektir.
            </DialogDescription>
          </DialogHeader>

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
              onClick={handlePublish}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yayınlanıyor...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Yayınla
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
