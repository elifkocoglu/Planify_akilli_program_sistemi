import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRedirectPath } from '@/lib/auth/getRedirectPath'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Oturum açıksa dashboard'a yönlendir
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      redirect(getRedirectPath(profile?.role))
    }
  } catch {
    // Oturum yoksa layout'u göster
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md px-4">{children}</div>
    </div>
  )
}
