import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SwapRequestList } from '@/components/staff/SwapRequestList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { SwapRequestRecord } from '@/lib/api/types'

export default async function SwapRequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('swap_requests')
    .select(`
      *,
      requester:profiles!swap_requests_requester_id_fkey(full_name),
      receiver:profiles!swap_requests_receiver_id_fkey(full_name),
      requester_slot:schedule_slots!swap_requests_requester_slot_id_fkey(id, date, start_time, end_time, status, department_id),
      receiver_slot:schedule_slots!swap_requests_receiver_slot_id_fkey(id, date, start_time, end_time, status, department_id)
    `)
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const requests: SwapRequestRecord[] = (data || []).map((r) => ({
    ...r,
    requester: r.requester as { full_name: string } | null,
    receiver: r.receiver as { full_name: string } | null,
    requester_slot: r.requester_slot as SwapRequestRecord['requester_slot'],
    receiver_slot: r.receiver_slot as SwapRequestRecord['receiver_slot'],
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Takas Taleplerim</h1>
          <p className="text-slate-400 mt-1">Gönderdiğiniz ve aldığınız takas taleplerini yönetin.</p>
        </div>
        <Link href="/dashboard/staff/swap/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Takas Talebi
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <SwapRequestList requests={requests} />
    </div>
  )
}
