'use client'

import { MonthlyCalendar } from '@/components/staff/MonthlyCalendar'

export default function StaffSchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Programım</h1>
        <p className="text-slate-400 mt-1">Aylık nöbet takviminizi görüntüleyin.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <MonthlyCalendar />
      </div>
    </div>
  )
}
