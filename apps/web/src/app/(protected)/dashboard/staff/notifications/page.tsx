'use client'

import { useUser } from '@/lib/auth/useUser'
import { NotificationList } from '@/components/staff/NotificationList'

export default function StaffNotificationsPage() {
  const { profile } = useUser()
  // profile.id ile client-side NotificationList kendi verisini çeker
  void profile
  return <NotificationList />
}
