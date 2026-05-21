import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useSchedule } from '@/hooks/useSchedule'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const DAY_HEADERS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

const CELL_SIZE = Dimensions.get('window').width / 7

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

function SkeletonBlock({ width, height, className }: { width?: number | string; height: number; className?: string }) {
  const opacity = usePulse()
  return (
    <Animated.View
      style={{ opacity, width: width as any, height, borderRadius: 8 }}
      className={`bg-slate-700 ${className ?? ''}`}
    />
  )
}

function CalendarSkeleton() {
  const opacity = usePulse()
  const cellH = CELL_SIZE * 0.85

  return (
    <View className="px-4">
      {/* Nav skeleton */}
      <View className="flex-row items-center justify-between py-4">
        <SkeletonBlock width={36} height={36} />
        <SkeletonBlock width={140} height={28} />
        <SkeletonBlock width={36} height={36} />
      </View>

      {/* Day headers skeleton */}
      <View className="flex-row mb-2">
        {DAY_HEADERS.map((d) => (
          <View key={d} style={{ width: CELL_SIZE }} className="items-center">
            <SkeletonBlock width={24} height={16} />
          </View>
        ))}
      </View>

      {/* 5 rows of 7 cells */}
      {[0, 1, 2, 3, 4].map((row) => (
        <Animated.View key={row} style={{ opacity }} className="flex-row mb-1">
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <View key={col} style={{ width: CELL_SIZE }} className="items-center py-0.5">
              <Animated.View
                style={{ width: cellH, height: cellH, borderRadius: cellH / 2 }}
                className="bg-slate-700"
              />
            </View>
          ))}
        </Animated.View>
      ))}
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
  hasSlot: boolean
  onPress: () => void
}

function DayCell({ day, dateStr, isToday, isSelected, hasSlot, onPress }: DayCellProps) {
  const cellH = CELL_SIZE * 0.82

  if (day === null) {
    // Empty cell — invisible, non-interactive
    return <View style={{ width: CELL_SIZE, height: CELL_SIZE * 0.95 }} />
  }

  // Determine circle style
  let circleBg = 'transparent'
  let textColor = '#1e293b'  // slate-900 — normal day

  if (isToday) {
    circleBg = '#3B82F6'   // bg-blue-500
    textColor = '#ffffff'
  } else if (isSelected) {
    circleBg = '#DBEAFE'   // bg-blue-100
    textColor = '#2563EB'  // text-blue-600
  }

  // Dot color
  const dotColor = isToday ? '#ffffff' : '#3B82F6'

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
          width: cellH,
          height: cellH,
          borderRadius: cellH / 2,
          backgroundColor: circleBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{ color: textColor, fontWeight: isToday || isSelected ? '700' : '400', fontSize: 14 }}
        >
          {day}
        </Text>
        {hasSlot && (
          <View
            style={{
              position: 'absolute',
              bottom: 3,
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: dotColor,
            }}
          />
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
  month: number   // 0-indexed
  todayStr: string
  selectedDate: string
  slotDates: Set<string>
  onDayPress: (dateStr: string) => void
}

function CalendarGrid({ year, month, todayStr, selectedDate, slotDates, onDayPress }: CalendarGridProps) {
  // First day of the month (0=Sun, 1=Mon ...)
  const firstDOW = new Date(year, month, 1).getDay()
  // Convert Sunday-based to Monday-based offset
  const offset = firstDOW === 0 ? 6 : firstDOW - 1

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthStr = String(month + 1).padStart(2, '0')

  // Build cells array: nulls for empty prefix, then 1..daysInMonth
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Pad to full rows (multiple of 7)
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }

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

      {/* Rows */}
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
                hasSlot={dateStr !== null && slotDates.has(dateStr)}
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
// Selected Day Detail Card
// ─────────────────────────────────────────────────────────────

function formatTurkishFull(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(t: string | null) {
  if (!t) return '--:--'
  return t.slice(0, 5)
}

interface SlotDetail {
  id: string
  date: string
  start_time: string
  end_time: string
  department_name: string | null
  schedule_title: string | null
  schedule_type: string | null
  notes: string | null
}

function DayDetailCard({ date, slot }: { date: string; slot: SlotDetail | null }) {
  return (
    <View className="mx-4 mb-4 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <View className="bg-slate-700/60 px-4 py-2.5">
        <Text className="text-white font-bold text-sm capitalize">
          {formatTurkishFull(date)}
        </Text>
      </View>

      {slot ? (
        <View className="px-4 py-4 gap-3">
          {/* Time */}
          <View className="flex-row items-center gap-2">
            <View className="bg-blue-700 rounded-xl w-10 h-10 items-center justify-center">
              <Ionicons name="time" size={18} color="#93C5FD" />
            </View>
            <View>
              <Text className="text-slate-400 text-xs">Nöbet Saatleri</Text>
              <Text className="text-white font-bold text-lg">
                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
              </Text>
            </View>
          </View>

          {/* Department */}
          {slot.department_name && (
            <View className="flex-row items-center gap-2">
              <View className="bg-purple-900/60 rounded-xl w-10 h-10 items-center justify-center">
                <Ionicons name="business" size={18} color="#C084FC" />
              </View>
              <View>
                <Text className="text-slate-400 text-xs">Departman</Text>
                <Text className="text-white font-semibold">{slot.department_name}</Text>
              </View>
            </View>
          )}

          {/* Schedule title */}
          {slot.schedule_title && (
            <View className="flex-row items-center gap-2">
              <View className="bg-emerald-900/60 rounded-xl w-10 h-10 items-center justify-center">
                <Ionicons name="document-text" size={18} color="#34D399" />
              </View>
              <View>
                <Text className="text-slate-400 text-xs">Program</Text>
                <Text className="text-white font-semibold">{slot.schedule_title}</Text>
              </View>
            </View>
          )}

          {/* Notes */}
          {slot.notes && (
            <View className="bg-slate-700/50 rounded-xl px-3 py-2.5 mt-1">
              <Text className="text-slate-400 text-xs mb-1">Notlar</Text>
              <Text className="text-slate-300 text-sm leading-5">{slot.notes}</Text>
            </View>
          )}
        </View>
      ) : (
        /* No shift on selected day */
        <View className="px-4 py-6 items-center gap-2">
          <Ionicons name="moon-outline" size={28} color="#475569" />
          <Text className="text-slate-500 text-sm">Bu gün için nöbet yok</Text>
        </View>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const {
    selectedDate,
    setSelectedDate,
    selectedMonth,
    slotDates,
    selectedSlot,
    loading,
    error,
    prevMonth,
    nextMonth,
    refresh,
    todayStr,
  } = useSchedule()

  const [refreshing, setRefreshing] = useState(false)

  async function onRefresh() {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
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
        <View className="px-5 pt-4 pb-2">
          <Text className="text-white text-2xl font-bold">Programım</Text>
          <Text className="text-slate-400 text-sm mt-0.5">Aylık nöbet takvimi</Text>
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
          <View className="px-2 mb-4">
            <CalendarGrid
              year={selectedMonth.year}
              month={selectedMonth.month}
              todayStr={todayStr}
              selectedDate={selectedDate}
              slotDates={slotDates}
              onDayPress={setSelectedDate}
            />
          </View>
        ) : null}

        {/* ── SELECTED DAY DETAIL ── */}
        {!loading && !error && (
          <DayDetailCard date={selectedDate} slot={selectedSlot} />
        )}

        {/* Bottom padding */}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  )
}

