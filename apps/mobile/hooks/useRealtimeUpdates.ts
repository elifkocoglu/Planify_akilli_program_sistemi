import { useEffect, useRef, useState, useCallback } from 'react'
import { Animated } from 'react-native'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/AuthContext'

// ─────────────────────────────────────────────────────────────
// Toast state & animation hook
// ─────────────────────────────────────────────────────────────

export interface ToastState {
  visible: boolean
  message: string
  translateY: Animated.Value
  opacity: Animated.Value
}

export function useScheduleRealtime(onUpdate: () => void) {
  const { user } = useAuth()
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  // Toast animation values
  const translateY = useRef(new Animated.Value(20)).current
  const opacity = useRef(new Animated.Value(0)).current
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    // Clear any pending hide
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)

    setToastMessage(msg)
    setToastVisible(true)

    // Slide up + fade in
    translateY.setValue(20)
    opacity.setValue(0)
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()

    // After 2s → fade out
    hideTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -10,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setToastVisible(false))
    }, 2000)
  }, [translateY, opacity])

  // Supabase realtime subscription
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`schedule-slots-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_slots',
          filter: `staff_id=eq.${user.id}`,
        },
        () => {
          onUpdateRef.current()
          showToast('Program güncellendi')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, showToast])

  return {
    toastVisible,
    toastMessage,
    toastTranslateY: translateY,
    toastOpacity: opacity,
  }
}
