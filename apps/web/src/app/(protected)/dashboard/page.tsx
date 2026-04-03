import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRedirectPath } from '@/lib/auth/getRedirectPath'

export default async function DashboardIndexPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  redirect(getRedirectPath(profile?.role))
}
