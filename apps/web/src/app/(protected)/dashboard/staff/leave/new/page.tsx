'use client'

import Link from 'next/link'
import { LeaveRequestForm } from '@/components/staff/LeaveRequestForm'
import { ArrowLeft } from 'lucide-react'

export default function NewLeaveRequestPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/staff/leave"
          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          İzin Taleplerime Dön
        </Link>
        <h1 className="text-2xl font-bold text-white">Yeni İzin Talebi</h1>
        <p className="text-slate-400 mt-1">İzin talebinizi oluşturun.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <LeaveRequestForm />
      </div>
    </div>
  )
}
