'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { respondToSwapRequest } from '@/lib/api/swap-requests'
import { useUser } from '@/lib/auth/useUser'
import type { SwapRequestRecord } from '@/lib/api/types'
import { parseLocalDate } from '@/lib/utils/date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, Loader2, X } from 'lucide-react'

interface SwapRequestListProps {
  requests: SwapRequestRecord[]
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' },
  approved_by_receiver: { label: 'Admin Onayı Bekleniyor', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  approved_by_admin: { label: 'Onaylandı', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
  rejected: { label: 'Reddedildi', color: 'border-red-500/30 text-red-400 bg-red-500/10' },
}

function formatSlotInfo(slot: { date: string; start_time: string; end_time: string } | null | undefined): string {
  if (!slot) return '—'
  const d = parseLocalDate(slot.date).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short',
  })
  return `${d} ${slot.start_time.slice(0, 5)}-${slot.end_time.slice(0, 5)}`
}

export function SwapRequestList({ requests }: SwapRequestListProps) {
  const { profile } = useUser()
  const router = useRouter()
  const [actionId, setActionId] = useState<string | null>(null)

  const sent = requests.filter((r) => r.requester_id === profile.id)
  const received = requests.filter((r) => r.receiver_id === profile.id)

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    setActionId(id)
    try {
      await respondToSwapRequest(id, action)
      toast.success(action === 'accept' ? 'Talep kabul edildi' : 'Talep reddedildi')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız')
    } finally {
      setActionId(null)
    }
  }

  const EmptyState = () => (
    <div className="py-12 text-center">
      <p className="text-slate-400">Talep bulunmuyor.</p>
    </div>
  )

  return (
    <Tabs defaultValue="sent" className="w-full">
      <TabsList className="bg-white/5 border border-white/10">
        <TabsTrigger value="sent" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
          Gönderdiğim ({sent.length})
        </TabsTrigger>
        <TabsTrigger value="received" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
          Gelen ({received.length})
        </TabsTrigger>
      </TabsList>

      {/* Sent Tab */}
      <TabsContent value="sent" className="mt-4">
        {sent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-400">Benim Slotum</TableHead>
                  <TableHead className="text-slate-400">Karşı Taraf</TableHead>
                  <TableHead className="text-slate-400">Karşı Slot</TableHead>
                  <TableHead className="text-slate-400">Durum</TableHead>
                  <TableHead className="text-slate-400">Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sent.map((r) => {
                  const sc = statusConfig[r.status] || statusConfig.pending
                  return (
                    <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-sm text-white">
                        {formatSlotInfo(r.requester_slot)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-300">
                        {r.receiver?.full_name || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-white">
                        {formatSlotInfo(r.receiver_slot)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={sc.color}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {new Date(r.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      {/* Received Tab */}
      <TabsContent value="received" className="mt-4">
        {received.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-400">Talep Eden</TableHead>
                  <TableHead className="text-slate-400">Onların Slotu</TableHead>
                  <TableHead className="text-slate-400">Benden İstenen</TableHead>
                  <TableHead className="text-slate-400">Durum</TableHead>
                  <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {received.map((r) => {
                  const sc = statusConfig[r.status] || statusConfig.pending
                  const canAct = r.status === 'pending'
                  return (
                    <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-sm text-slate-300">
                        {r.requester?.full_name || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-white">
                        {formatSlotInfo(r.requester_slot)}
                      </TableCell>
                      <TableCell className="text-sm text-white">
                        {formatSlotInfo(r.receiver_slot)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={sc.color}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canAct && (
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleAction(r.id, 'accept')}
                              disabled={actionId === r.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {actionId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                              Kabul
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(r.id, 'reject')}
                              disabled={actionId === r.id}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Reddet
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
