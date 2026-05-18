import { useState, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase/client'

interface ScheduleSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  shiftTypeName: string
  departmentName: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function isToday(dateStr: string) {
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

export default function ScheduleScreen() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) loadSchedule()
  }, [user])

  async function loadSchedule() {
    setLoading(true)
    setError('')
    try {
      const today = new Date().toISOString().split('T')[0]
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const { data, error: fetchError } = await supabase
        .from('schedule_assignments')
        .select(`
          id,
          date,
          schedule_slots (
            start_time,
            end_time,
            shift_types (name),
            departments (name)
          )
        `)
        .eq('staff_id', user!.id)
        .gte('date', today)
        .lte('date', nextMonth)
        .order('date', { ascending: true })

      if (fetchError) throw fetchError

      const formatted: ScheduleSlot[] = (data ?? []).map((item: any) => ({
        id: item.id,
        date: item.date,
        startTime: item.schedule_slots?.start_time ?? '',
        endTime: item.schedule_slots?.end_time ?? '',
        shiftTypeName: item.schedule_slots?.shift_types?.name ?? 'Bilinmiyor',
        departmentName: item.schedule_slots?.departments?.name ?? 'Bilinmiyor',
      }))

      setSlots(formatted)
    } catch {
      setError('Program yüklenemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-slate-400 mt-3">Program yükleniyor...</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="bg-slate-800 px-5 pt-14 pb-5 border-b border-slate-700">
        <Text className="text-white text-2xl font-bold">Programım</Text>
        <Text className="text-slate-400 text-sm mt-1">Önümüzdeki 30 günlük vardiya planı</Text>
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text className="text-red-400 text-center mt-3 text-base">{error}</Text>
          <TouchableOpacity
            onPress={loadSchedule}
            className="mt-4 bg-blue-600 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : slots.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="calendar-outline" size={64} color="#334155" />
          <Text className="text-slate-400 text-center mt-4 text-base">
            Önümüzdeki 30 gün için atanmış vardiya bulunamadı.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {slots.map((slot) => {
            const today = isToday(slot.date)
            return (
              <View
                key={slot.id}
                className={`bg-slate-800 rounded-2xl p-4 mb-3 border ${
                  today ? 'border-blue-500' : 'border-slate-700'
                }`}
              >
                {today && (
                  <View className="bg-blue-600 rounded-lg px-2 py-0.5 self-start mb-2">
                    <Text className="text-white text-xs font-bold">BUGÜN</Text>
                  </View>
                )}
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className={`font-bold text-base ${today ? 'text-blue-300' : 'text-white'}`}>
                      {formatDate(slot.date)}
                    </Text>
                    <Text className="text-slate-300 text-sm mt-1">{slot.shiftTypeName}</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">{slot.departmentName}</Text>
                  </View>
                  <View className="bg-slate-700 rounded-xl px-3 py-2 items-center">
                    <Ionicons name="time-outline" size={14} color="#94A3B8" />
                    <Text className="text-slate-300 text-xs font-medium mt-1">
                      {slot.startTime.slice(0, 5)}
                    </Text>
                    <Text className="text-slate-500 text-xs">—</Text>
                    <Text className="text-slate-300 text-xs font-medium">
                      {slot.endTime.slice(0, 5)}
                    </Text>
                  </View>
                </View>
              </View>
            )
          })}
          <View className="h-6" />
        </ScrollView>
      )}
    </View>
  )
}
