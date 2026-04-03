'use client'

import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from './getRedirectPath'

export interface UserProfile {
  id: string
  full_name: string | null
  role: UserRole
  institution_id: string | null
  is_active: boolean
}

export interface UserContextValue {
  user: User
  profile: UserProfile
}

export const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: UserContextValue
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
