import { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'

// ─── Tip Yapılandırması ───────────────────────────────────────
type TypeConfig = {
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bg: string
}

function getTypeConfig(type: string): TypeConfig {
  switch (type) {
    case 'schedule_published':
      return { icon: 'calendar', color: '#3B82F6', bg: '#1E3A5F' }
    case 'swap_request':
      return { icon: 'swap-horizontal', color: '#F97316', bg: '#4A2C0A' }
    case 'swap_approved':
      return { icon: 'checkmark-circle', color: '#10B981', bg: '#0A2E1E' }
    case 'swap_rejected':
      return { icon: 'close-circle', color: '#EF4444', bg: '#3B0A0A' }
    case 'leave_approved':
      return { icon: 'umbrella', color: '#10B981', bg: '#0A2E1E' }
    case 'leave_rejected':
      return { icon: 'close-circle', color: '#EF4444', bg: '#3B0A0A' }
    case 'shift_changed':
      return { icon: 'warning', color: '#F59E0B', bg: '#3B2A0A' }
    default:
      return { icon: 'notifications', color: '#3B82F6', bg: '#1E3A5F' }
  }
}

// ─── Göreceli Zaman Formatı ──────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date

  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'Az önce'
  if (minutes < 60) return `${minutes} dk önce`
  if (hours < 24) return `${hours} saat önce`
  if (days < 7) return `${days} gün önce`

  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
  })
}

// ─── İlgili Sayfaya Yönlendirme ──────────────────────────────
function getTargetRoute(type: string): string {
  switch (type) {
    case 'schedule_published':
    case 'shift_changed':
      return '/(tabs)/schedule'
    case 'swap_request':
    case 'swap_approved':
    case 'swap_rejected':
      return '/(tabs)/requests'
    case 'leave_approved':
    case 'leave_rejected':
      return '/(tabs)/requests'
    default:
      return '/(tabs)/notifications'
  }
}

// ─── Skeleton Loading ─────────────────────────────────────────
function SkeletonRow() {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-800">
      <View className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0" />
      <View className="flex-1 gap-2">
        <View className="h-3.5 bg-slate-700 rounded-full w-2/3" />
        <View className="h-3 bg-slate-800 rounded-full w-full" />
        <View className="h-3 bg-slate-800 rounded-full w-1/3" />
      </View>
    </View>
  )
}

// ─── Bildirim Satırı ─────────────────────────────────────────
function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification
  onPress: (item: AppNotification) => void
}) {
  const config = getTypeConfig(item.type)

  return (
    <>
      <TouchableOpacity
        onPress={() => onPress(item)}
        activeOpacity={0.7}
        className={`flex-row items-start gap-3 px-4 py-3.5 ${
          !item.isRead ? 'bg-blue-500/5' : 'bg-transparent'
        }`}
      >
        {/* Sol: Tip İkonu */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: config.bg }}
        >
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>

        {/* Orta: İçerik */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className={`text-sm flex-1 mr-2 ${
                !item.isRead ? 'font-bold text-white' : 'font-medium text-slate-300'
              }`}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {/* Sağ: Okunmamış göstergesi */}
            {!item.isRead && (
              <View className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-0.5" />
            )}
          </View>
          <Text className="text-slate-400 text-xs leading-4" numberOfLines={2}>
            {item.body}
          </Text>
          {/* Zaman */}
          <Text className="text-slate-600 text-xs mt-1.5">
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
      {/* Ayraç */}
      <View className="h-px bg-slate-800 mx-4" />
    </>
  )
}

// ─── Ana Ekran ────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter()
  const { notifications, loading, unreadCount, refresh, markAsRead, markAllRead } =
    useNotifications()

  const handlePress = useCallback(
    async (item: AppNotification) => {
      // Okunmamışsa okundu işaretle
      if (!item.isRead) {
        await markAsRead(item.id)
      }
      // İlgili sayfaya git
      const target = getTargetRoute(item.type)
      if (target !== '/(tabs)/notifications') {
        router.push(target as any)
      }
    },
    [markAsRead, router]
  )

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      {/* ─── Üst Bar ─── */}
      <View className="bg-slate-900 px-5 pt-2 pb-4 border-b border-slate-800">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Bildirimler</Text>
            {/* Özet satırı */}
            {!loading && (
              <Text
                className={`text-sm mt-1 ${
                  unreadCount === 0 ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {unreadCount === 0
                  ? 'Tüm bildirimler okundu'
                  : `${unreadCount} okunmamış bildirim`}
              </Text>
            )}
          </View>
          {/* Tümünü Okundu İşaretle */}
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllRead}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 mt-1"
              activeOpacity={0.7}
            >
              <Text className="text-blue-400 text-xs font-semibold">
                Tümünü Okundu İşaretle
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── İçerik ─── */}
      {loading ? (
        // Skeleton
        <View className="flex-1">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : notifications.length === 0 ? (
        // Boş durum
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center mb-4">
            <Ionicons name="notifications-off-outline" size={40} color="#475569" />
          </View>
          <Text className="text-slate-300 text-lg font-semibold text-center">
            Bildirim yok
          </Text>
          <Text className="text-slate-500 text-sm text-center mt-2">
            Henüz bildiriminiz bulunmuyor.{'\n'}Yeni bildirimler burada görünecek.
          </Text>
        </View>
      ) : (
        // Bildirim listesi
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow item={item} onPress={handlePress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
          ListFooterComponent={<View className="h-6" />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </SafeAreaView>
  )
}
