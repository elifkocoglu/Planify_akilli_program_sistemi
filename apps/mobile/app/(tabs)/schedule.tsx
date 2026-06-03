import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSchedule } from '@/hooks/useSchedule'
import { useScheduleRealtime } from '@/hooks/useRealtimeUpdates'
import type { ScheduleSlot } from '@/hooks/useSchedule'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const TURKISH_WEEKDAYS = [
  'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi',
]

const DAY_HEADERS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

const CELL_SIZE = Dimensions.get('window').width / 7

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatTime(t: string | null): string {
  if (!t) return '--:--'
  return t.slice(0, 5)
}

function formatTurkishFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const weekday = TURKISH_WEEKDAYS[d.getDay()]
  const day = d.getDate()
  const month = TURKISH_MONTHS[d.getMonth()]
  const year = d.getFullYear()
  return `${weekday}, ${day} ${month} ${year}`
}

/** Calculate total hours from an array of slots */
function calcTotalHours(slots: ScheduleSlot[]): number {
  return slots.reduce((acc, s) => {
    const [sh, sm] = s.start_time.split(':').map(Number)
    const [eh, em] = s.end_time.split(':').map(Number)
    const minutes = (eh * 60 + em) - (sh * 60 + sm)
    return acc + Math.max(0, minutes)
  }, 0) / 60
}

// ─────────────────────────────────────────────────────────────
// Skeleton helpers
// ─────────────────────────────────────────────────────────────

function usePulse() {
  const opacity = useRef(new Animated.Value(0.3)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])
  return opacity
}

function SkeletonBlock({ width, height }: { width?: number | string; height: number }) {
  const opacity = usePulse()
  return (
    <Animated.View
      style={{ opacity, width: width as any, height, borderRadius: 8, backgroundColor: '#334155' }}
    />
  )
}

function CalendarSkeleton() {
  const cellH = CELL_SIZE * 0.82
  return (
    <View className="px-4">
      <View className="flex-row mb-2 mt-1">
        {DAY_HEADERS.map((d) => (
          <View key={d} style={{ width: CELL_SIZE }} className="items-center">
            <SkeletonBlock width={20} height={14} />
          </View>
        ))}
      </View>
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} className="flex-row mb-1">
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <View key={col} style={{ width: CELL_SIZE }} className="items-center py-0.5">
              <Animated.View
                style={{
                  width: cellH, height: cellH,
                  borderRadius: cellH / 2, backgroundColor: '#334155',
                }}
              />
            </View>
          ))}
        </View>
      ))}
      {/* Detail skeleton */}
      <View className="mt-4 gap-3">
        <SkeletonBlock width="50%" height={20} />
        <SkeletonBlock width="100%" height={100} />
        <SkeletonBlock width="100%" height={80} />
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Calendar Day Cell
// ─────────────────────────────────────────────────────────────

interface DayCellProps {
  day: number | null
  dateStr: string | null
  isToday: boolean
  isSelected: boolean
  slotTime: string | null
  onPress: () => void
}

function DayCell({ day, isToday, isSelected, slotTime, onPress }: DayCellProps) {
  const cellH = CELL_SIZE * 0.82

  if (day === null) {
    return <View style={{ width: CELL_SIZE, height: CELL_SIZE * 0.95 }} />
  }

  let circleBg = 'transparent'
  let textColor = '#f8fafc'  // slate-50 — readable on dark bg

  if (isToday) {
    circleBg = '#3B82F6'
    textColor = '#ffffff'
  } else if (isSelected) {
    circleBg = '#1E3A8A'  // dark blue — visible on dark bg
    textColor = '#93C5FD' // light blue text
  }

  const dotColor = isToday ? '#ffffff' : '#60A5FA'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ width: CELL_SIZE, height: CELL_SIZE * 0.95 }}
      className="items-center justify-center"
      accessibilityLabel={`${day} gününü seç`}
      accessibilityRole="button"
    >
      <View
        style={{
          width: cellH, height: cellH,
          borderRadius: cellH / 2,
          backgroundColor: circleBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: textColor, fontWeight: isToday || isSelected ? '700' : '400', fontSize: 14 }}>
          {day}
        </Text>
        {slotTime && (
          <Text style={{ color: dotColor, fontSize: 9, fontWeight: '600', marginTop: 1 }}>
            {formatTime(slotTime)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────
// Calendar Grid
// ─────────────────────────────────────────────────────────────

interface CalendarGridProps {
  year: number
  month: number
  todayStr: string
  selectedDate: string
  slots: ScheduleSlot[]
  onDayPress: (dateStr: string) => void
}

function CalendarGrid({ year, month, todayStr, selectedDate, slots, onDayPress }: CalendarGridProps) {
  const firstDOW = new Date(year, month, 1).getDay()
  const offset = firstDOW === 0 ? 6 : firstDOW - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthStr = String(month + 1).padStart(2, '0')

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  const slotMap = new Map(slots.map(s => [s.date, s.start_time]))

  return (
    <View>
      {/* Day headers */}
      <View className="flex-row mb-1">
        {DAY_HEADERS.map((label) => (
          <View key={label} style={{ width: CELL_SIZE }} className="items-center py-1">
            <Text className="text-slate-500 text-xs font-semibold">{label}</Text>
          </View>
        ))}
      </View>

      {rows.map((row, rowIdx) => (
        <View key={rowIdx} className="flex-row">
          {row.map((day, colIdx) => {
            const dateStr = day !== null
              ? `${year}-${monthStr}-${String(day).padStart(2, '0')}`
              : null
            return (
              <DayCell
                key={`${rowIdx}-${colIdx}`}
                day={day}
                dateStr={dateStr}
                isToday={dateStr === todayStr}
                isSelected={dateStr === selectedDate}
                slotTime={dateStr ? (slotMap.get(dateStr) ?? null) : null}
                onPress={() => { if (dateStr) onDayPress(dateStr) }}
              />
            )
          })}
        </View>
      ))}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    active:    { label: 'Aktif',        bg: '#14532D', text: '#86EFAC' },
    swapped:   { label: 'Takas Edildi', bg: '#1E3A8A', text: '#93C5FD' },
    cancelled: { label: 'İptal',        bg: '#7F1D1D', text: '#FCA5A5' },
  }
  const c = config[status] ?? { label: status, bg: '#334155', text: '#94A3B8' }

  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: c.text, fontSize: 12, fontWeight: '600' }}>{c.label}</Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Slot Card (Bölüm 2)
// ─────────────────────────────────────────────────────────────

interface SlotCardProps {
  slot: ScheduleSlot
  todayStr: string
  onSwapPress: (slotId: string) => void
}

function SlotCard({ slot, todayStr, onSwapPress }: SlotCardProps) {
  const canSwap = slot.status === 'active' && slot.date >= todayStr

  return (
    <View
      className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: '#22C55E' }}
    >
      {/* Top section: time + department */}
      <View className="flex-row items-center px-4 py-4 gap-4">
        {/* Time block */}
        <View className="items-start">
          <Text className="text-white font-bold text-3xl leading-none">
            {formatTime(slot.start_time)}
          </Text>
          <Text className="text-slate-400 text-base mt-0.5">
            — {formatTime(slot.end_time)}
          </Text>
        </View>

        {/* Divider */}
        <View className="w-px h-12 bg-slate-700" />

        {/* Info */}
        <View className="flex-1">
          {slot.department_name ? (
            <Text className="text-slate-200 font-semibold text-sm">
              {slot.department_name}
            </Text>
          ) : (
            <Text className="text-slate-500 text-sm">Departman belirtilmemiş</Text>
          )}
          {slot.schedule_title && (
            <Text className="text-slate-400 text-xs mt-1">
              {slot.schedule_title}
            </Text>
          )}
          {slot.notes && (
            <Text className="text-slate-500 text-xs mt-1 leading-4" numberOfLines={2}>
              {slot.notes}
            </Text>
          )}
        </View>
      </View>

      {/* Divider line */}
      <View className="h-px bg-slate-700 mx-4" />

      {/* Bottom section: badge + swap button */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <StatusBadge status={slot.status} />

        {canSwap && (
          <TouchableOpacity
            onPress={() => onSwapPress(slot.id)}
            className="flex-row items-center gap-1.5 bg-blue-700 rounded-xl px-3 py-2"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Takas talebi oluştur"
          >
            <Ionicons name="swap-horizontal" size={14} color="#BFDBFE" />
            <Text className="text-blue-100 text-xs font-semibold">Takas Talebi</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Empty Day Card
// ─────────────────────────────────────────────────────────────

function EmptyDayCard({ dateStr, todayStr }: { dateStr: string; todayStr: string }) {
  const isPast = dateStr < todayStr
  return (
    <View className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-6 items-center gap-2">
      <Ionicons name="calendar-outline" size={32} color="#475569" />
      <Text className="text-slate-400 text-sm font-medium">Bu gün nöbet yok</Text>
      {isPast && (
        <Text className="text-slate-600 text-xs">Geçmiş tarihe ait kayıt yok</Text>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Monthly Summary (Bölüm 3)
// ─────────────────────────────────────────────────────────────

interface MonthlySummaryProps {
  slots: ScheduleSlot[]
  monthName: string
}

function MonthlySummary({ slots, monthName }: MonthlySummaryProps) {
  const totalHours = calcTotalHours(slots)
  const activeCount = slots.filter((s) => s.status === 'active').length

  const items = [
    { label: 'Toplam Nöbet', value: String(slots.length), color: '#3B82F6' },
    {
      label: 'Toplam Saat',
      value: `${Math.round(totalHours)} saat`,
      color: '#10B981',
    },
    { label: 'Aktif Nöbet', value: String(activeCount), color: '#F59E0B' },
  ]

  return (
    <View className="px-4 mb-4">
      <Text className="text-white font-bold text-base mb-3">
        {monthName} Özeti
      </Text>
      <View className="flex-row gap-3">
        {items.map((item) => (
          <View
            key={item.label}
            className="flex-1 bg-white rounded-xl items-center py-3 px-1"
            style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 }}
          >
            <Text style={{ color: item.color, fontSize: 22, fontWeight: '800' }}>
              {item.value}
            </Text>
            <Text className="text-slate-500 text-xs text-center mt-0.5 leading-4">
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Toast Notification
// ─────────────────────────────────────────────────────────────

interface ToastProps {
  visible: boolean
  message: string
  translateY: Animated.Value
  opacity: Animated.Value
}

function Toast({ visible, message, translateY, opacity }: ToastProps) {
  if (!visible) return null
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 16,
        alignSelf: 'center',
        transform: [{ translateY }],
        opacity,
        zIndex: 100,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#3B82F6',
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
      <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '600' }}>
        {message}
      </Text>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────
// Department List (Bölüm 4)
// ─────────────────────────────────────────────────────────────

function DepartmentList({ year, month }: { year: number, month: number }) {
  const { profile } = useAuth()
  const [deptSlots, setDeptSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDept() {
      if (!profile?.departmentId) {
        setLoading(false)
        return
      }
      setLoading(true)
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { data, error } = await supabase
        .from('schedule_slots')
        .select(`
          id, date, start_time, end_time,
          staff:profiles!staff_id(full_name),
          schedules!inner(status)
        `)
        .eq('schedules.status', 'published')
        .eq('department_id', profile.departmentId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .in('status', ['active', 'swapped'])
        .order('date', { ascending: true })

      if (error) console.error('Department slots err:', error)
      setDeptSlots(data ?? [])
      setLoading(false)
    }
    fetchDept()
  }, [year, month, profile?.departmentId])

  if (loading) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator color="#3B82F6" />
      </View>
    )
  }

  if (deptSlots.length === 0) {
    return (
      <View className="py-10 px-4 items-center gap-3">
        <Ionicons name="calendar-outline" size={32} color="#475569" />
        <Text className="text-center text-slate-400">Bu ay için departman nöbeti bulunamadı.</Text>
      </View>
    )
  }

  // Group by date
  const grouped = deptSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = []
    acc[slot.date].push(slot)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <View className="px-4 pb-10 mt-2">
      {Object.entries(grouped).map(([date, slotsForDay]) => (
        <View key={date} className="mb-4">
          <Text className="text-blue-400 font-bold mb-2 ml-1 text-sm">{formatTurkishFull(date)}</Text>
          <View className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
            {slotsForDay.map((s, idx) => (
              <View key={s.id} className={`flex-row items-center justify-between p-3 ${idx !== slotsForDay.length - 1 ? 'border-b border-slate-700' : ''}`}>
                <Text className="text-white font-medium flex-1 mr-2">{s.staff?.full_name ?? 'Bilinmiyor'}</Text>
                <Text className="text-slate-400 text-sm">{formatTime(s.start_time)} - {formatTime(s.end_time)}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const router = useRouter()
  const {
    selectedDate,
    setSelectedDate,
    selectedMonth,
    slots,
    slotDates,
    selectedSlot,
    loading,
    error,
    prevMonth,
    nextMonth,
    goToToday,
    refresh,
    todayStr,
  } = useSchedule()

  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  // Realtime updates with toast
  const { toastVisible, toastMessage, toastTranslateY, toastOpacity } =
    useScheduleRealtime(refresh)

  const today = new Date()
  const isCurrentMonth =
    selectedMonth.year === today.getFullYear() &&
    selectedMonth.month === today.getMonth()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  function handleSwapPress(slotId: string) {
    router.push(`/(tabs)/requests?tab=swap&mySlotId=${slotId}` as any)
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
      {/* Toast overlay */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        translateY={toastTranslateY}
        opacity={toastOpacity}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {/* ── HEADER ── */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Programım</Text>
            <Text className="text-slate-400 text-sm mt-0.5">Aylık nöbet takvimi</Text>
          </View>
          {/* Toggle View */}
          <View className="flex-row bg-slate-800 rounded-lg p-1 border border-slate-700">
            <TouchableOpacity
              onPress={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md ${viewMode === 'calendar' ? 'bg-blue-600' : 'bg-transparent'}`}
            >
              <Ionicons name="calendar-outline" size={18} color={viewMode === 'calendar' ? '#fff' : '#94A3B8'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md ${viewMode === 'list' ? 'bg-blue-600' : 'bg-transparent'}`}
            >
              <Ionicons name="list-outline" size={18} color={viewMode === 'list' ? '#fff' : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── MONTH NAVIGATION ── */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity
            onPress={prevMonth}
            className="bg-slate-800 border border-slate-700 rounded-xl w-10 h-10 items-center justify-center"
            accessibilityLabel="Önceki ay"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <Text className="text-white text-xl font-bold">
            {TURKISH_MONTHS[selectedMonth.month]} {selectedMonth.year}
          </Text>

          <TouchableOpacity
            onPress={nextMonth}
            className="bg-slate-800 border border-slate-700 rounded-xl w-10 h-10 items-center justify-center"
            accessibilityLabel="Sonraki ay"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ── ERROR BANNER ── */}
        {error && (
          <View className="mx-4 mb-3 bg-red-900/70 border border-red-600 rounded-xl px-4 py-3">
            <Text className="text-red-300 text-sm text-center mb-2">
              Veriler yüklenemedi.
            </Text>
            <TouchableOpacity
              onPress={refresh}
              className="bg-red-700 rounded-lg py-2 items-center"
              accessibilityRole="button"
            >
              <Text className="text-white font-semibold text-sm">Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── CALENDAR OR SKELETON ── */}
        {loading && !refreshing ? (
          <CalendarSkeleton />
        ) : !error ? (
          viewMode === 'calendar' ? (
            <>
              {/* Calendar Grid */}
              <View className="px-2 mb-3">
              <CalendarGrid
                year={selectedMonth.year}
                month={selectedMonth.month}
                todayStr={todayStr}
                selectedDate={selectedDate}
                slots={slots}
                onDayPress={setSelectedDate}
              />
            </View>

            {/* ── SELECTED DAY HEADER ── */}
            <View className="px-4 mb-3">
              <Text className="text-slate-300 text-sm font-semibold capitalize">
                {formatTurkishFull(selectedDate)}
              </Text>
            </View>

            {/* ── SLOT CARD ── */}
            <View className="px-4 mb-5">
              {selectedSlot ? (
                <SlotCard
                  slot={selectedSlot}
                  todayStr={todayStr}
                  onSwapPress={handleSwapPress}
                />
              ) : (
                <EmptyDayCard dateStr={selectedDate} todayStr={todayStr} />
              )}
            </View>

            {/* ── MONTHLY SUMMARY ── */}
            {!loading && (
              <MonthlySummary
                slots={slots}
                monthName={TURKISH_MONTHS[selectedMonth.month]}
              />
            )}
            </>
          ) : (
            <DepartmentList year={selectedMonth.year} month={selectedMonth.month} />
          )
        ) : null}

        {/* Bottom padding */}
        <View className="h-24" />
      </ScrollView>

      {/* ── FLOATING "BUGÜN" BUTTON ── */}
      {!isCurrentMonth && (
        <TouchableOpacity
          onPress={goToToday}
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            backgroundColor: '#3B82F6',
            borderRadius: 24,
            paddingHorizontal: 18,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          activeOpacity={0.85}
          accessibilityLabel="Bugüne git"
          accessibilityRole="button"
        >
          <Ionicons name="today" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Bugün</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}
