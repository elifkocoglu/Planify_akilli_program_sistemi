import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  fullName: string
  role: string
  institutionId: string | null
  departmentId: string | null
  isActive: boolean
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // ── fetchProfile ─────────────────────────────────────────
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, institution_id, department_id, is_active')
        .eq('id', userId)
        .single()

      if (data) {
        // is_active kontrolü
        if (!data.is_active) {
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        setProfile({
          id: data.id,
          fullName: data.full_name,
          role: data.role,
          institutionId: data.institution_id,
          departmentId: data.department_id,
          isActive: data.is_active,
        })
      }
    } catch (error) {
      console.error('Profil yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── refreshProfile — join.tsx'den çağrılır ───────────────
  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      await fetchProfile(currentUser.id)
    }
  }, [fetchProfile])

  // ── Auth state listener ───────────────────────────────────
  useEffect(() => {
    // Mevcut session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Session değişikliklerini dinle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // ── signOut ───────────────────────────────────────────────
  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Çıkış yapılamadı:', error)
    } finally {
      setProfile(null)
      setSession(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
