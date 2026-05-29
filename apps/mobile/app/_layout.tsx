import { useEffect, useRef, useState } from 'react'
import { Stack } from 'expo-router'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { StatusBar } from 'expo-status-bar'
import { NotificationToast } from '@/components/shared/NotificationToast'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'
import '../global.css'

// ToastManager: AuthProvider içinde çalışması gerekiyor
function ToastManager() {
  const [toastNotif, setToastNotif] = useState<AppNotification | null>(null)
  const { onNewNotification } = useNotifications()
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const cleanup = onNewNotification((n) => {
      setToastNotif(n)
    })
    cleanupRef.current = cleanup
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [onNewNotification])

  return (
    <NotificationToast
      notification={toastNotif}
      onHide={() => setToastNotif(null)}
    />
  )
}

function RootLayoutNav() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <ToastManager />
    </>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="auto" />
    </AuthProvider>
  )
}
