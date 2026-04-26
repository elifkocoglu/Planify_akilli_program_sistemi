import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserProvider, type UserProfile } from '@/lib/auth/UserContext'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  // Oturum kontrolü
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Profil çek
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, institution_id, is_active')
    .eq('id', user.id)
    .single()

  // DEBUG: profil hatası konsolda göster
  if (profileError) {
    console.error('[ProtectedLayout] Profile fetch error:', profileError.message, profileError.code)
  }

  if (profileError || !profile) {
    // Profil bulunamadıysa signOut yapma — RLS sorunu olabilir
    // Sadece login'e yönlendir
    console.error('[ProtectedLayout] No profile found for user:', user.id)
    await supabase.auth.signOut()
    redirect('/login?error=Profil+bulunamadi')
  }

  // Hesap aktiflik kontrolü
  if (!profile.is_active) {
    await supabase.auth.signOut()
    redirect('/login?reason=disabled')
  }

  const userProfile: UserProfile = {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role as UserProfile['role'],
    institution_id: profile.institution_id,
    is_active: profile.is_active,
  }

  return (
    <UserProvider value={{ user, profile: userProfile }}>
      {children}
    </UserProvider>
  )
}
