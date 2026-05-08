'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cancelLeaveRequest } from '@/lib/api/leave-requests'
import type { LeaveRequestRecord } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Loader2 } from 'lucide-react'

interface LeaveRequestListProps {
  requests: LeaveRequestRecord[]
}

const typeConfig: Record<string, { label: string; color: string }> = {
  annual: { label: 'Yıllık İzin', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  sick: { label: 'Rapor', color: 'border-orange-500/30 text-orange-400 bg-orange-500/10' },
  unpaid: { label: 'Ücretsiz İzin', color: 'border-slate-500/30 text-slate-400 bg-slate-500/10' },
  maternity: { label: 'Doğum İzni', color: 'border-pink-500/30 text-pink-400 bg-pink-500/10' },
  administrative: { label: 'İdari İzin', color: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' },
  approved: { label: 'Onaylandı', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
  rejected: { label: 'Reddedildi', color: 'border-red-500/30 text-red-400 bg-red-500/10' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function daysBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export function LeaveRequestList({ requests }: LeaveRequestListProps) {
  const router = useRouter()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const handleCancel = async (id: string) => {
    setCancellingId(id)
    try {
      await cancelLeaveRequest(id)
      toast.success('İzin talebi iptal edildi')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İptal işlemi başarısız')
    } finally {
      setCancellingId(null)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-slate-400">Henüz izin talebiniz bulunmuyor.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-slate-400">Tip</TableHead>
            <TableHead className="text-slate-400">Tarih Aralığı</TableHead>
            <TableHead className="text-slate-400">Sebep</TableHead>
            <TableHead className="text-slate-400">Durum</TableHead>
            <TableHead className="text-slate-400">Onaylayan</TableHead>
            <TableHead className="text-slate-400">Talep Tarihi</TableHead>
            <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req) => {
            const tc = typeConfig[req.type] || typeConfig.annual
            const sc = statusConfig[req.status] || statusConfig.pending
            const days = daysBetween(req.start_date, req.end_date)

            return (
              <TableRow key={req.id} className="border-white/10 hover:bg-white/5">
                <TableCell>
                  <Badge variant="outline" className={tc.color}>
                    {tc.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-white text-sm">
                  {formatDate(req.start_date)} — {formatDate(req.end_date)}
                  <span className="text-slate-400 ml-2">({days} gün)</span>
                </TableCell>
                <TableCell>
                  {req.reason ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={<span className="text-sm text-slate-300 max-w-[150px] truncate block cursor-help" />}>
                          {req.reason}
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-800 border-white/10 text-white max-w-xs">
                          {req.reason}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-slate-500 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={sc.color}>
                    {sc.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-300">
                  {req.reviewer?.full_name || '—'}
                </TableCell>
                <TableCell className="text-sm text-slate-400">
                  {new Date(req.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </TableCell>
                <TableCell className="text-right">
                  {req.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(req.id)}
                      disabled={cancellingId === req.id}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      {cancellingId === req.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'İptal Et'
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
