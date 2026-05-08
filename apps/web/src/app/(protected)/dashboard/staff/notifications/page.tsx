import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationList } from '@/components/staff/NotificationList'
import type { NotificationRecord } from '@/lib/api/types'

export default async function NotificationsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(0, 19)

  const notifications: NotificationRecord[] = (data || []) as NotificationRecord[]

  return (
    <NotificationList
      initialNotifications={notifications}
    />
  )
}
