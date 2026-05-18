import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase/client'

interface Notification {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  type: string
}

export default function NotificationsScreen() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Notification | null>(null)

  useEffect(() => {
    if (user) loadNotifications()
  }, [user])

  async function loadNotifications() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, is_read, created_at, type')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(
        (data ?? []).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          isRead: n.is_read,
          createdAt: n.created_at,
          type: n.type ?? 'general',
        }))
      )
    } catch {
      // sessiz hata
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user!.id)
      .eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <View className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="bg-slate-800 px-5 pt-14 pb-4 border-b border-slate-700">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Bildirimler</Text>
            {unreadCount > 0 && (
              <Text className="text-blue-400 text-sm mt-1">
                {unreadCount} okunmamış bildirim
              </Text>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} className="bg-slate-700 rounded-xl px-3 py-2">
              <Text className="text-blue-400 text-xs font-semibold">Tümünü Okundu İşaretle</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="notifications-off-outline" size={64} color="#334155" />
          <Text className="text-slate-400 text-center mt-4 text-base">
            Henüz bildirim yok.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
          {notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              onPress={() => {
                if (!notif.isRead) markAsRead(notif.id)
                setSelected(notif)
              }}
              className={`rounded-2xl p-4 mb-2.5 border ${
                notif.isRead
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-blue-600/10 border-blue-500/30'
              }`}
            >
              <View className="flex-row items-start gap-3">
                <View
                  className={`w-8 h-8 rounded-xl items-center justify-center mt-0.5 ${
                    notif.isRead ? 'bg-slate-700' : 'bg-blue-600/30'
                  }`}
                >
                  <Ionicons
                    name="notifications"
                    size={16}
                    color={notif.isRead ? '#64748B' : '#60A5FA'}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`font-semibold text-sm flex-1 mr-2 ${
                        notif.isRead ? 'text-slate-300' : 'text-white'
                      }`}
                      numberOfLines={1}
                    >
                      {notif.title}
                    </Text>
                    {!notif.isRead && (
                      <View className="bg-blue-500 rounded-full w-2 h-2" />
                    )}
                  </View>
                  <Text className="text-slate-400 text-xs mt-1 leading-4" numberOfLines={2}>
                    {notif.message}
                  </Text>
                  <Text className="text-slate-600 text-xs mt-1.5">
                    {new Date(notif.createdAt).toLocaleString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <View className="h-6" />
        </ScrollView>
      )}

      {/* Detay modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-800 rounded-t-3xl px-6 pt-6 pb-10">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-bold flex-1 mr-3">
                {selected?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text className="text-slate-300 text-sm leading-6">{selected?.message}</Text>
            <Text className="text-slate-500 text-xs mt-4">
              {selected
                ? new Date(selected.createdAt).toLocaleString('tr-TR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  )
}
