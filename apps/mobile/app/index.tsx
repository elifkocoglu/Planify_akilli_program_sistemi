import { useEffect } from 'react'
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth/AuthContext'

export default function IndexScreen() {
  const { session, profile, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // 1. Session yok → giriş
    if (!session) {
      router.replace('/(auth)/login')
      return
    }

    // Profile henüz yüklenmedi → bekle
    if (!profile) return

    // 2. Staff değil → erişim engeli (aşağıda render edilir)
    if (profile.role !== 'staff') return

    // 3. Staff ama kuruma bağlı değil → davet kodu
    if (!profile.institutionId) {
      router.replace('/(auth)/join' as any)
      return
    }

    // 4. Her şey tamam → ana sayfa
    router.replace('/(tabs)' as any)
  }, [loading, session, profile])

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-slate-400 mt-4 text-base">Yükleniyor...</Text>
      </View>
    )
  }

  // ── Admin / yönetici rolü — bu uygulama sadece personel için ──
  if (session && profile && profile.role !== 'staff') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-8">
        <View className="bg-slate-800 rounded-2xl p-8 w-full items-center border border-slate-700">
          <Text className="text-4xl mb-4">🔒</Text>
          <Text className="text-white text-xl font-bold text-center mb-3">
            Erişim Kısıtlandı
          </Text>
          <Text className="text-slate-400 text-center text-base leading-6 mb-6">
            Bu uygulama yalnızca personel kullanımı içindir.
            Yönetici işlemleri için web arayüzünü kullanınız.
          </Text>
          <TouchableOpacity
            onPress={signOut}
            className="bg-blue-600 rounded-xl py-3 px-8 w-full items-center"
            accessibilityRole="button"
          >
            <Text className="text-white font-semibold text-base">Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Yönlendirme bekleniyor (spinner) ─────────────────────
  return (
    <View className="flex-1 items-center justify-center bg-slate-900">
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  )
}
