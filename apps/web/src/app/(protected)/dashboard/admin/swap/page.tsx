'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useUser } from '@/lib/auth/useUser'
import { createClient } from '@/lib/supabase/client'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowRightLeft, Check, Loader2, Plus, X } from 'lucide-react'

interface SwapSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  department_id: string | null
  departments?: { name: string } | null
}

interface SwapRequest {
  id: string
  status: string
  created_at: string
  reject_reason: string | null
  requester_id: string
  receiver_id: string
  requester: { id: string; full_name: string } | null
  receiver: { id: string; full_name: string } | null
  requester_slot: SwapSlot | null
  receiver_slot: SwapSlot | null
}

function formatSlot(slot: SwapSlot | null | undefined): string {
  if (!slot) return '—'
  const d = new Date(slot.date + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', weekday: 'short',
  })
  const start = slot.start_time.slice(0, 5)
  const end = slot.end_time.slice(0, 5)
  return `${d} · ${start}-${end}`
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' },
  approved_by_receiver: { label: 'Admin Onayı Bekleniyor', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  approved_by_admin: { label: 'Onaylandı', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
  rejected: { label: 'Reddedildi', color: 'border-red-500/30 text-red-400 bg-red-500/10' },
}

export default function AdminSwapPage() {
  const { profile } = useUser()
  const router = useRouter()
  const [pendingSwaps, setPendingSwaps] = useState<SwapRequest[]>([])
  const [mySwaps, setMySwaps] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 1) Admin onayı bekleyen talepler (approved_by_receiver)
      const { data: pending } = await supabase
        .from('swap_requests')
        .select(`
          id, status, created_at, reject_reason, requester_id, receiver_id,
          requester:profiles!swap_requests_requester_id_fkey(id, full_name),
          receiver:profiles!swap_requests_receiver_id_fkey(id, full_name),
          requester_slot:schedule_slots!swap_requests_requester_slot_id_fkey(id, date, start_time, end_time, department_id, departments(name)),
          receiver_slot:schedule_slots!swap_requests_receiver_slot_id_fkey(id, date, start_time, end_time, department_id, departments(name))
        `)
        .eq('status', 'approved_by_receiver')
        .order('created_at', { ascending: false })

      // 2) Admin'in kendi (requester veya receiver) olduğu talepler
      const { data: mine } = await supabase
        .from('swap_requests')
        .select(`
          id, status, created_at, reject_reason, requester_id, receiver_id,
          requester:profiles!swap_requests_requester_id_fkey(id, full_name),
          receiver:profiles!swap_requests_receiver_id_fkey(id, full_name),
          requester_slot:schedule_slots!swap_requests_requester_slot_id_fkey(id, date, start_time, end_time, department_id, departments(name)),
          receiver_slot:schedule_slots!swap_requests_receiver_slot_id_fkey(id, date, start_time, end_time, department_id, departments(name))
        `)
        .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })

      // Supabase joined query'de ilişkisel alanlar dizi olarak döner;
      // normalize ederek SwapRequest tipine uygun hale getir
      const normalize = (rows: unknown[] | null): SwapRequest[] =>
        (rows ?? []).map((row: unknown) => {
          const r = row as Record<string, unknown>
          const pickFirst = (v: unknown) =>
            Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
          return {
            id: r.id,
            status: r.status,
            created_at: r.created_at,
            reject_reason: r.reject_reason,
            requester_id: r.requester_id,
            receiver_id: r.receiver_id,
            requester: pickFirst(r.requester),
            receiver: pickFirst(r.receiver),
            requester_slot: pickFirst(r.requester_slot),
            receiver_slot: pickFirst(r.receiver_slot),
          } as SwapRequest
        })

      setPendingSwaps(normalize(pending))
      setMySwaps(normalize(mine))
    } catch {
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'accept') => {
    setActionId(id)
    try {
      const res = await fetch(`/api/swap-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'İşlem başarısız')
      toast.success(
        action === 'approve'
          ? 'Takas onaylandı! Nöbetler güncellendi.'
          : action === 'accept'
          ? 'Talep kabul edildi'
          : 'Talep reddedildi'
      )
      router.refresh()
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setActionId(null)
    }
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
        <ArrowRightLeft className="h-6 w-6 text-slate-500" />
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Takas Yönetimi</h1>
          <p className="text-slate-400 mt-1">
            Admin onayı bekleyen talepleri inceleyin ve kendi taleplerinizi yönetin.
          </p>
        </div>
        <Link href="/dashboard/admin/swap/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Takas Talebi
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger
            value="pending"
            className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400"
          >
            Admin Onayı Bekleyenler
            {pendingSwaps.length > 0 && (
              <span className="ml-2 bg-cyan-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {pendingSwaps.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="mine"
            className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400"
          >
            Kendi Taleplerim ({mySwaps.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Admin Approval Tab */}
        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : pendingSwaps.length === 0 ? (
            <EmptyState message="Admin onayı bekleyen takas talebi yok" />
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400">Talep Eden</TableHead>
                    <TableHead className="text-slate-400">Kendi Nöbeti</TableHead>
                    <TableHead className="text-slate-400">Karşı Taraf</TableHead>
                    <TableHead className="text-slate-400">Karşı Nöbet</TableHead>
                    <TableHead className="text-slate-400">Tarih</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSwaps.map((r) => (
                    <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-sm text-white font-medium">
                        {r.requester?.full_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-300">
                        {formatSlot(r.requester_slot)}
                      </TableCell>
                      <TableCell className="text-sm text-white">
                        {r.receiver?.full_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-300">
                        {formatSlot(r.receiver_slot)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {new Date(r.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric', month: 'short',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleAction(r.id, 'approve')}
                            disabled={actionId === r.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs"
                          >
                            {actionId === r.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(r.id, 'reject')}
                            disabled={actionId === r.id}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 px-3 text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Reddet
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* My Swaps Tab */}
        <TabsContent value="mine" className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : mySwaps.length === 0 ? (
            <EmptyState message="Henüz takas talebiniz bulunmuyor" />
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400">Talep Eden</TableHead>
                    <TableHead className="text-slate-400">Kendi Nöbeti</TableHead>
                    <TableHead className="text-slate-400">Karşı Taraf</TableHead>
                    <TableHead className="text-slate-400">Karşı Nöbet</TableHead>
                    <TableHead className="text-slate-400">Durum</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mySwaps.map((r) => {
                    const sc = statusConfig[r.status] || statusConfig.pending
                    const isReceiver = r.receiver_id === profile.id
                    const canAccept = isReceiver && r.status === 'pending'
                    return (
                      <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-sm text-white font-medium">
                          {r.requester?.full_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-300">
                          {formatSlot(r.requester_slot)}
                        </TableCell>
                        <TableCell className="text-sm text-white">
                          {r.receiver?.full_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-300">
                          {formatSlot(r.receiver_slot)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sc.color}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canAccept && (
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleAction(r.id, 'accept')}
                                disabled={actionId === r.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs"
                              >
                                {actionId === r.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3 mr-1" />
                                )}
                                Kabul
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(r.id, 'reject')}
                                disabled={actionId === r.id}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 px-3 text-xs"
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
    </div>
  )
}
