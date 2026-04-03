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

  if (profileError || !profile) {
    // Profil yoksa çıkış yap
    await supabase.auth.signOut()
    redirect('/login')
  }

  // Hesap aktiflik kontrolü
  if (!profile.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=Hesabiniz+devre+disi+birakilmistir')
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
