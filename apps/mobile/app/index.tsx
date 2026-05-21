import { useEffect } from 'react'
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth/AuthContext'

export default function IndexScreen() {
  const { session, profile, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!session) {
      router.replace('/(auth)/login')
      return
    }

    if (profile?.role === 'staff') {
      router.replace('/(tabs)' as any)
      return
    }
  }, [loading, session, profile])

  // Yükleniyor
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-slate-400 mt-4 text-base">Yükleniyor...</Text>
      </View>
    )
  }

  // Admin rolü — bu uygulama sadece personel için
  if (session && profile && profile.role !== 'staff') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-8">
        <View className="bg-slate-800 rounded-2xl p-8 w-full items-center">
          <Text className="text-4xl mb-4">🔒</Text>
          <Text className="text-white text-xl font-bold text-center mb-3">
            Erişim Kısıtlandı
          </Text>
          <Text className="text-slate-400 text-center text-base leading-6 mb-6">
            Bu uygulama yalnızca personel kullanımı içindir. Yönetici işlemleri için
            web arayüzünü kullanınız.
          </Text>
          <TouchableOpacity
            onPress={signOut}
            className="bg-blue-600 rounded-xl py-3 px-8 w-full items-center"
          >
            <Text className="text-white font-semibold text-base">Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Boş durum — yönlendirme bekleniyor
  return (
    <View className="flex-1 items-center justify-center bg-slate-900">
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  )
}
