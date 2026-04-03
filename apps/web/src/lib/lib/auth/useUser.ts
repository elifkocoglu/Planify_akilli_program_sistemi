'use client'

import { useContext } from 'react'
import { UserContext, type UserContextValue } from './UserContext'

/**
 * Client Component'larda kullanıcı bilgilerine erişmek için hook.
 * Mutlaka (protected) layout altında kullanılmalıdır.
 */
export function useUser(): UserContextValue {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error(
      'useUser() fonksiyonu yalnızca (protected) layout içindeki bileşenlerde kullanılabilir.'
    )
  }
  return context
}
