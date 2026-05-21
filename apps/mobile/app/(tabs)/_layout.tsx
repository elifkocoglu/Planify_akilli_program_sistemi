import { useEffect } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth/AuthContext'
import { useUnreadCount } from '@/hooks/useNotifications'

function TabBarIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap
  color: string
  focused: boolean
}) {
  return (
    <Ionicons
      name={focused ? (name as any) : (`${String(name)}-outline` as any)}
      size={24}
      color={color}
    />
  )
}

function NotificationTabIcon({
  color,
  focused,
}: {
  color: string
  focused: boolean
}) {
  const unreadCount = useUnreadCount()

  return (
    <View className="relative">
      <Ionicons
        name={focused ? 'notifications' : 'notifications-outline'}
        size={24}
        color={color}
      />
      {unreadCount > 0 && (
        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-4 h-4 items-center justify-center px-1">
          <Text className="text-white text-xs font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  )
}

export default function TabsLayout() {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/login')
    }
  }, [loading, session])

  if (loading || !session) return null

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Programım',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Talepler',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="swap-horizontal" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ color, focused }) => (
            <NotificationTabIcon color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  )
}
