import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TodayShiftCard } from '@/components/staff/TodayShiftCard'
import { WeekSummaryCard } from '@/components/staff/WeekSummaryCard'
import { UpcomingShiftsList } from '@/components/staff/UpcomingShiftsList'
import { JoinInstitutionBanner } from '@/components/staff/JoinInstitutionBanner'
import Link from 'next/link'
import { Bell, ArrowRight } from 'lucide-react'
import type { NotificationRecord } from '@/lib/api/types'

const typeIcons: Record<string, string> = {
  schedule_published: '📅',
  swap_request: '🔄',
  swap_approved: '✅',
  swap_rejected: '❌',
  leave_approved: '🏖️',
  leave_rejected: '❌',
  shift_changed: '⚠️',
  leave_request: '📋',
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1) return 'Az önce'
  if (diffMin < 60) return `${diffMin} dk önce`
  if (diffHr < 24) return `${diffHr} saat önce`
  if (diffDay === 1) return 'Dün'
  if (diffDay < 7) return `${diffDay} gün önce`
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

export default async function StaffDashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, institution_id, monthly_max_shifts')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Monday of this week
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const mondayStr = monday.toISOString().split('T')[0]
  const sundayDate = new Date(monday)
  sundayDate.setDate(monday.getDate() + 6)
  const sundayStr = sundayDate.toISOString().split('T')[0]

  // First and last day of month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

  // Next 7 days end
  const next7 = new Date(today)
  next7.setDate(today.getDate() + 7)
  const next7Str = next7.toISOString().split('T')[0]

  // Fetch all data in parallel
  const [
    todaySlotRes,
    weekSlotsRes,
    monthSlotsRes,
    upcomingSlotsRes,
    pendingLeaveRes,
    pendingSwapRes,
    recentNotifRes,
    nextSlotRes,
  ] = await Promise.all([
    // Today's slot
    supabase
      .from('schedule_slots')
      .select('id, date, start_time, end_time, department_id, departments(name)')
      .eq('staff_id', user.id)
      .eq('date', todayStr)
      .eq('status', 'active')
      .limit(1),
    // This week's slots count
    supabase
      .from('schedule_slots')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', user.id)
      .gte('date', mondayStr)
      .lte('date', sundayStr)
      .eq('status', 'active'),
    // This month's slots count
    supabase
      .from('schedule_slots')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .eq('status', 'active'),
    // Upcoming 7 days slots
    supabase
      .from('schedule_slots')
      .select('id, date, start_time, end_time, department_id, departments(name)')
      .eq('staff_id', user.id)
      .gte('date', todayStr)
      .lte('date', next7Str)
      .eq('status', 'active')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true }),
    // Unread notifications count
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
    // Pending leave requests
    supabase
      .from('leave_requests')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', user.id)
      .eq('status', 'pending'),
    // Pending swap requests
    supabase
      .from('swap_requests')
      .select('id', { count: 'exact', head: true })
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'pending'),
    // Recent 5 notifications
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    // Next slot (for empty today card)
    supabase
      .from('schedule_slots')
      .select('date')
      .eq('staff_id', user.id)
      .gt('date', todayStr)
      .eq('status', 'active')
      .order('date', { ascending: true })
      .limit(1),
  ])

  const todaySlot = todaySlotRes.data?.[0]
    ? {
        id: todaySlotRes.data[0].id,
        date: todaySlotRes.data[0].date,
        start_time: todaySlotRes.data[0].start_time,
        end_time: todaySlotRes.data[0].end_time,
        department_name: ((todaySlotRes.data[0].departments as unknown) as { name: string } | null)?.name,
      }
    : null

  const upcomingSlots = (upcomingSlotsRes.data || []).map((s) => ({
    id: s.id,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    department_name: ((s.departments as unknown) as { name: string } | null)?.name,
  }))

  const weekCount = weekSlotsRes.count || 0
  const monthCount = monthSlotsRes.count || 0
  const pendingCount = (pendingLeaveRes.count || 0) + (pendingSwapRes.count || 0)
  const nextSlotDate = nextSlotRes.data?.[0]?.date || null
  const recentNotifications: NotificationRecord[] = (recentNotifRes.data || []) as NotificationRecord[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hoş geldiniz, {profile.full_name || 'Personel'} 👋
        </h1>
        <p className="text-slate-400 mt-1">
          Program ve görevlerinizi buradan takip edebilirsiniz.
        </p>
      </div>

      {/* Manual Invite Code Banner for Staff without Institution */}
      {profile.institution_id === null && (
        <JoinInstitutionBanner userId={user.id} />
      )}

      {/* Today Shift Card */}
      <TodayShiftCard todaySlot={todaySlot} nextSlotDate={nextSlotDate} />

      {/* Week Summary */}
      <WeekSummaryCard
        weekCount={weekCount}
        monthCount={monthCount}
        monthlyLimit={profile.monthly_max_shifts}
        pendingCount={pendingCount}
      />

      {/* Bottom: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Shifts */}
        <UpcomingShiftsList slots={upcomingSlots} todayDate={todayStr} />

        {/* Recent Notifications */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Son Bildirimler</h3>
            <Link
              href="/dashboard/staff/notifications"
              className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Tüm Bildirimleri Gör
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Bildirim yok.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-lg p-3 border ${
                    n.is_read
                      ? 'border-transparent bg-white/[0.02]'
                      : 'border-blue-500/20 bg-blue-500/[0.05]'
                  }`}
                >
                  <span className="text-base flex-shrink-0">
                    {typeIcons[n.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${n.is_read ? 'text-slate-300' : 'text-white font-semibold'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{relativeTime(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
