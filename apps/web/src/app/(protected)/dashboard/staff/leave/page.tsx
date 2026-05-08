import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LeaveRequestList } from '@/components/staff/LeaveRequestList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { LeaveRequestRecord } from '@/lib/api/types'

export default async function LeaveRequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('leave_requests')
    .select('*, reviewer:profiles!leave_requests_reviewed_by_fkey(full_name)')
    .eq('staff_id', user.id)
    .order('created_at', { ascending: false })

  const requests: LeaveRequestRecord[] = (data || []).map((r) => ({
    ...r,
    reviewer: r.reviewer as { full_name: string } | null,
  }))

  const pending = requests.filter((r) => r.status === 'pending').length
  const approved = requests.filter((r) => r.status === 'approved').length
  const rejected = requests.filter((r) => r.status === 'rejected').length

  const statCards = [
    { label: 'Bekleyen', value: pending, color: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
    { label: 'Onaylanan', value: approved, color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' },
    { label: 'Reddedilen', value: rejected, color: 'border-red-500/20 bg-red-500/10 text-red-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">İzin Taleplerim</h1>
          <p className="text-slate-400 mt-1">İzin taleplerinizi görüntüleyin ve yönetin.</p>
        </div>
        <Link href="/dashboard/staff/leave/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Yeni İzin Talebi
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <p className="text-sm opacity-80">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <LeaveRequestList requests={requests} />
    </div>
  )
}
