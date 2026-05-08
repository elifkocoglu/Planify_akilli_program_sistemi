import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: { scheduleId: string }
}

function formatTime(t: string) { return t.slice(0, 5) }

export default async function ScheduleDetailPage({ params }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: schedule } = await supabase
    .from('schedules')
    .select('*, departments(name)')
    .eq('id', params.scheduleId)
    .single()

  if (!schedule) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-slate-400">Program bulunamadı.</p>
        <Link href="/dashboard/staff/schedule" className="text-blue-400 text-sm mt-2 inline-block hover:underline">
          ← Takvime Dön
        </Link>
      </div>
    )
  }

  const { data: slots } = await supabase
    .from('schedule_slots')
    .select('*, profiles(full_name), departments(name)')
    .eq('schedule_id', params.scheduleId)
    .eq('staff_id', user.id)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  const statusLabels: Record<string, string> = {
    draft: 'Taslak', published: 'Yayında', archived: 'Arşiv',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/staff/schedule" className="text-sm text-blue-400 hover:underline mb-2 inline-block">
            ← Takvime Dön
          </Link>
          <h1 className="text-2xl font-bold text-white">{schedule.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="border-white/20 text-slate-300">
              {statusLabels[schedule.status] || schedule.status}
            </Badge>
            {(schedule.departments as { name: string } | null)?.name && (
              <span className="flex items-center gap-1 text-sm text-slate-400">
                <MapPin className="w-3.5 h-3.5" />
                {(schedule.departments as { name: string }).name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        {(!slots || slots.length === 0) ? (
          <div className="p-12 text-center">
            <p className="text-slate-400">Bu programda size ait nöbet bulunmuyor.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {slots.map((slot) => (
              <div key={slot.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                <div className="w-20 text-center">
                  <p className="text-xs text-slate-400">
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short' })}
                  </p>
                  <p className="text-sm font-bold text-white">
                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    slot.status === 'active'
                      ? 'border-emerald-500/30 text-emerald-400'
                      : slot.status === 'swapped'
                        ? 'border-amber-500/30 text-amber-400'
                        : 'border-red-500/30 text-red-400'
                  }
                >
                  {slot.status === 'active' ? 'Aktif' : slot.status === 'swapped' ? 'Takas' : 'İptal'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
