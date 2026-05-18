import { Stack } from 'expo-router'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { StatusBar } from 'expo-status-bar'
import '../global.css'

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
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
