import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
  requireRole?: string
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const { session, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!session) {
      router.replace('/(auth)/login')
      return
    }
    if (requireRole && profile?.role !== requireRole) {
      router.replace('/')
    }
  }, [loading, session, profile, requireRole])

  if (loading) return <LoadingSpinner fullScreen />
  if (!session) return null
  if (requireRole && profile?.role !== requireRole) return null

  return <>{children}</>
}
