import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth/AuthContext'
import { useRouter } from 'expo-router'

export default function DashboardScreen() {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  const menuItems = [
    {
      icon: 'calendar-outline' as const,
      label: 'Programımı Gör',
      subtitle: 'Vardiya ve mesai planım',
      color: '#3B82F6',
      bg: '#1E3A8A',
      route: '/schedule',
    },
    {
      icon: 'swap-horizontal-outline' as const,
      label: 'Takas Talebi',
      subtitle: 'Vardiya değişim isteği gönder',
      color: '#8B5CF6',
      bg: '#2E1065',
      route: '/requests',
    },
    {
      icon: 'document-text-outline' as const,
      label: 'İzin Talebi',
      subtitle: 'İzin başvurusu oluştur',
      color: '#10B981',
      bg: '#064E3B',
      route: '/requests',
    },
    {
      icon: 'notifications-outline' as const,
      label: 'Bildirimler',
      subtitle: 'Duyuru ve bildirimlerim',
      color: '#F59E0B',
      bg: '#451A03',
      route: '/notifications',
    },
  ]

  return (
    <View className="flex-1 bg-slate-900">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-blue-600 px-6 pt-14 pb-8">
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text className="text-blue-200 text-sm">Hoş geldiniz 👋</Text>
              <Text className="text-white text-2xl font-bold">
                {profile?.fullName ?? 'Personel'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={signOut}
              className="bg-blue-700 rounded-xl p-2"
            >
              <Ionicons name="log-out-outline" size={22} color="#93C5FD" />
            </TouchableOpacity>
          </View>
        </View>

        {/* İçerik */}
        <View className="px-5 py-6">
          <Text className="text-white text-lg font-bold mb-4">Hızlı Erişim</Text>

          <View className="flex-row flex-wrap gap-3">
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => router.push(item.route as '/')}
                className="bg-slate-800 rounded-2xl p-4 border border-slate-700"
                style={{ width: '47%' }}
              >
                <View
                  className="w-11 h-11 rounded-xl items-center justify-center mb-3"
                  style={{ backgroundColor: item.bg }}
                >
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text className="text-white font-semibold text-sm mb-1">
                  {item.label}
                </Text>
                <Text className="text-slate-400 text-xs leading-4">{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bilgi kartı */}
          <View className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-4 mt-4">
            <Text className="text-blue-400 font-semibold text-sm mb-1">
              📋 Planify Personel Uygulaması
            </Text>
            <Text className="text-slate-400 text-xs leading-5">
              Programınızı görüntüleyebilir, vardiya takas talebinde bulunabilir ve
              izin başvurusu yapabilirsiniz.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
