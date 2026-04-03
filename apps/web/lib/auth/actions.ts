'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOutAction() {
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch {
    // Sessizce başarısız olsa da yönlendir
  }
  redirect('/login')
}
