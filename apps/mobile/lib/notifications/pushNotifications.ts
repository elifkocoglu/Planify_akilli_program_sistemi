import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase/client'

// ─── Bildirim Gösterim Ayarları ──────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// ─── Push Token Kaydı ────────────────────────────────────────
export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  try {
    // Fiziksel cihaz kontrolü
    if (!Device.isDevice) {
      console.log('[Push] Sadece fiziksel cihazda çalışır, Expo Go simülatörde push gönderilemez')
      return null
    }

    // Mevcut izin durumunu kontrol et
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    // İzin verilmemişse iste
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Bildirim izni reddedildi')
      return null
    }

    // Android kanal ayarı
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Genel Bildirimler',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
      })
    }

    // Expo push token al
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
    const token = tokenResponse.data

    console.log('[Push] Token alındı:', token)

    // Token'ı Supabase'e kaydet
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId)

    if (error) {
      console.warn('[Push] Token kaydedilemedi:', error.message)
    } else {
      console.log('[Push] Token başarıyla kaydedildi')
    }

    return token
  } catch (err) {
    console.warn('[Push] Token alınırken hata:', err)
    return null
  }
}

// ─── Bildirim Dinleyicileri ──────────────────────────────────
export function useNotificationListeners(
  onNotification?: (notification: Notifications.Notification) => void
) {
  const router = useRouter()

  useEffect(() => {
    // Uygulama açıkken gelen bildirim
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        onNotification?.(notification)
      }
    )

    // Bildirime tıklanınca (uygulama arka plandayken/kapalıyken)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >
        if (data?.screen && typeof data.screen === 'string') {
          router.push(data.screen as any)
        }
      }
    )

    return () => {
      notificationListener.remove()
      responseListener.remove()
    }
  }, [onNotification, router])
}
