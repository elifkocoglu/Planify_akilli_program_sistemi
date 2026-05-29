import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { AppNotification } from '@/hooks/useNotifications'

// Bildirim tipine göre ikon ve renk yapılandırması
function getTypeConfig(type: string): {
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bg: string
} {
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

interface NotificationToastProps {
  notification: AppNotification | null
  onHide: () => void
}

export function NotificationToast({ notification, onHide }: NotificationToastProps) {
  const router = useRouter()
  const pathname = usePathname()
  const translateY = useRef(new Animated.Value(-120)).current
  const opacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!notification) return

    // Bildirimler ekranındaysa toast gösterme
    if (pathname.includes('notifications')) {
      return
    }

    // Ekrana giriş animasyonu
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 15,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // 3 saniye sonra otomatik kapat
    timerRef.current = setTimeout(() => {
      hide()
    }, 3000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification])

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide()
      // Reset for next notification
      translateY.setValue(-120)
      opacity.setValue(0)
    })
  }

  const handlePress = () => {
    hide()
    router.push('/(tabs)/notifications')
  }

  if (!notification) return null

  const config = getTypeConfig(notification.type)

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 55,
          left: 16,
          right: 16,
          zIndex: 9999,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        className="bg-slate-800 rounded-2xl p-4 flex-row items-center gap-3"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {/* İkon */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
          style={{ backgroundColor: config.bg }}
        >
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>

        {/* İçerik */}
        <View className="flex-1">
          <Text className="text-white font-semibold text-sm" numberOfLines={1}>
            {notification.title}
          </Text>
          <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
            {notification.body}
          </Text>
        </View>

        {/* Kapat butonu */}
        <TouchableOpacity onPress={hide} className="p-1 flex-shrink-0">
          <Ionicons name="close" size={16} color="#64748B" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  )
}
