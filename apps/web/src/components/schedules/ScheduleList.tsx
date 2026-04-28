'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScheduleCard } from './ScheduleCard'
import { PublishButton } from './PublishButton'
import { deleteSchedule, updateSchedule } from '@/lib/api/schedules'
import type { ScheduleRecord } from '@/lib/api/types'
import { CalendarX } from 'lucide-react'

interface ScheduleListProps {
  schedules: ScheduleRecord[]
  basePath: string
}

export function ScheduleList({ schedules, basePath }: ScheduleListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [publishId, setPublishId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Bu taslak programı silmek istediğinizden emin misiniz?')) return
    setDeletingId(id)
    try {
      await deleteSchedule(id)
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Silme hatası'
      alert(message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm('Bu programı arşivlemek istediğinizden emin misiniz?')) return
    try {
      await updateSchedule(id, { status: 'archived' })
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Arşivleme hatası'
      alert(message)
    }
  }

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <CalendarX className="h-8 w-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">Program bulunamadı</h3>
        <p className="text-sm text-slate-400 text-center max-w-sm">
          Henüz program oluşturulmamış. Yeni bir program oluşturarak başlayabilirsiniz.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {schedules.map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            basePath={basePath}
            onPublish={(id) => setPublishId(id)}
            onDelete={handleDelete}
            onArchive={handleArchive}
          />
        ))}
      </div>

      {/* Publish confirmation dialog */}
      {publishId && (
        <PublishButton
          scheduleId={publishId}
          autoOpen
          onClose={() => setPublishId(null)}
          onSuccess={() => {
            setPublishId(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
