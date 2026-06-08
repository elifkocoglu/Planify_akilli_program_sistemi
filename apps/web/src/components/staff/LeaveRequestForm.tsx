'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/auth/useUser'
import { createLeaveRequest } from '@/lib/api/leave-requests'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, Calendar, Loader2 } from 'lucide-react'
import { parseLocalDate } from '@/lib/utils/date'

const leaveTypes = [
  { value: 'annual', label: 'Yıllık İzin' },
  { value: 'sick', label: 'Rapor' },
  { value: 'unpaid', label: 'Ücretsiz İzin' },
  { value: 'maternity', label: 'Doğum İzni' },
  { value: 'administrative', label: 'İdari İzin' },
]

interface ConflictSlot {
  date: string
  start_time: string
  end_time: string
}

function countBusinessDays(startStr: string, endStr: string): number {
  const start = parseLocalDate(startStr)
  const end = parseLocalDate(endStr)
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

function formatDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
  })
}

export function LeaveRequestForm() {
  const router = useRouter()
  const { profile } = useUser()
  const [type, setType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictSlot[]>([])
  const [loadingConflicts, setLoadingConflicts] = useState(false)

  // Tarih aralığındaki nöbetleri kontrol et
  useEffect(() => {
    if (!startDate || !endDate) {
      setConflicts([])
      return
    }

    const fetchConflicts = async () => {
      setLoadingConflicts(true)
      const supabase = createClient()

      const { data } = await supabase
        .from('schedule_slots')
        .select('date, start_time, end_time')
        .eq('staff_id', profile.id)
        .in('status', ['active', 'swapped'])
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      setConflicts(data || [])
      setLoadingConflicts(false)
    }

    fetchConflicts()
  }, [startDate, endDate, profile.id])

  const businessDays = startDate && endDate ? countBusinessDays(startDate, endDate) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!type || !startDate || !endDate) {
      toast.error('Lütfen tüm zorunlu alanları doldurun')
      return
    }

    setSubmitting(true)
    try {
      await createLeaveRequest({
        type: type as 'annual' | 'sick' | 'unpaid' | 'maternity' | 'administrative',
        startDate,
        endDate,
        reason: reason || undefined,
      })
      toast.success('İzin talebiniz iletildi')
      router.push('/dashboard/staff/leave')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {/* İzin Tipi */}
      <div className="space-y-2">
        <Label className="text-slate-300">İzin Tipi *</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="İzin tipi seçin" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-white/10">
            {leaveTypes.map((lt) => (
              <SelectItem key={lt.value} value={lt.value} className="text-white hover:bg-white/10">
                {lt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tarihler */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Başlangıç Tarihi *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full pl-10 pr-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Bitiş Tarihi *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split('T')[0]}
              className="w-full pl-10 pr-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Gün sayısı */}
      {startDate && endDate && businessDays > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-slate-300">
            <span className="font-semibold text-white">{businessDays}</span> iş günü
          </span>
        </div>
      )}

      {/* Çakışan nöbetler */}
      {loadingConflicts && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Nöbetler kontrol ediliyor...
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">
                Bu tarihler arasında {conflicts.length} nöbetiniz bulunmaktadır:
              </p>
              <ul className="mt-2 space-y-1">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-sm text-amber-200/80">
                    {formatDate(c.date)} {c.start_time.slice(0, 5)}-{c.end_time.slice(0, 5)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sebep */}
      <div className="space-y-2">
        <Label className="text-slate-300">Sebep / Açıklama</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="İzin sebebinizi yazın (opsiyonel)"
          className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 min-h-[100px]"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={submitting || !type || !startDate || !endDate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Gönderiliyor...
          </>
        ) : (
          'İzin Talebi Gönder'
        )}
      </Button>
    </form>
  )
}
