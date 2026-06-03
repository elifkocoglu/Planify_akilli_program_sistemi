import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface TodaySlot {
  id: string
  start_time: string
  end_time: string
  department_name: string | null
  schedule_title: string | null
}

interface UpcomingSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  department_name: string | null
}

interface DashboardData {
  todaySlot: TodaySlot | null
  weeklyCount: number
  monthlyCount: number
  pendingCount: number
  upcomingSlots: UpcomingSlot[]
  nextShiftDate: string | null
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon ...
  const diffToMonday = (day + 6) % 7
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - diffToMonday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
  }
}

function getMonthBounds() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]
  return { monthStart, monthEnd }
}

function formatTurkishDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(dateStr: string): { day: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.toLocaleDateString('tr-TR', { day: '2-digit' })
  const month = d.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase()
  return { day, month }
}

function formatTime(t: string | null): string {
  if (!t) return '--:--'
  return t.slice(0, 5)
}

// ─────────────────────────────────────────────────────────────
// Skeleton component
// ─────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={{ opacity }}
      className={`bg-slate-700 rounded-xl ${className ?? ''}`}
    />
  )
}

function SkeletonDashboard() {
  return (
    <View className="px-5 pt-4 gap-4">
      {/* Today card skeleton */}
      <SkeletonBlock className="h-28 w-full" />
      {/* Summary cards skeleton */}
      <View className="flex-row gap-3">
        <SkeletonBlock className="h-24 flex-1" />
        <SkeletonBlock className="h-24 flex-1" />
        <SkeletonBlock className="h-24 flex-1" />
      </View>
      {/* Upcoming list skeleton */}
      <SkeletonBlock className="h-6 w-40" />
      {[1, 2, 3].map((i) => (
        <SkeletonBlock key={i} className="h-16 w-full" />
      ))}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { profile, user, signOut } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const next7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // ── Fetch all dashboard data ─────────────────────────────
  const fetchDashboard = useCallback(async () => {
    if (!user?.id) return
    setError(null)

    try {
      const { weekStart, weekEnd } = getWeekBounds()
      const { monthStart, monthEnd } = getMonthBounds()

      // 1. Bugünkü nöbet
      const { data: todayData, error: todayErr } = await supabase
        .from('schedule_slots')
        .select('*, schedules!inner(title, status), departments(name)')
        .eq('staff_id', user.id)
        .eq('date', today)
        .in('status', ['active', 'swapped'])
        .eq('schedules.status', 'published')
        .maybeSingle()

      if (todayErr) throw todayErr

      // 2. Bu haftaki nöbet sayısı
      const { data: weekData, error: weekErr } = await supabase
        .from('schedule_slots')
        .select('date, start_time, end_time')
        .eq('staff_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .in('status', ['active', 'swapped'])

      if (weekErr) throw weekErr

      // 3. Bu ayki nöbet sayısı
      const { data: monthData, error: monthErr } = await supabase
        .from('schedule_slots')
        .select('date')
        .eq('staff_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .in('status', ['active', 'swapped'])

      if (monthErr) throw monthErr

      // 4. Yaklaşan nöbetler (bugün dahil, 7 gün)
      const { data: upcomingData, error: upcomingErr } = await supabase
        .from('schedule_slots')
        .select('*, departments(name), schedules!inner(status)')
        .eq('staff_id', user.id)
        .gte('date', today)
        .lte('date', next7days)
        .in('status', ['active', 'swapped'])
        .eq('schedules.status', 'published')
        .order('date', { ascending: true })

      if (upcomingErr) throw upcomingErr

      // 5. Bekleyen talep sayısı
      const { count: pendingCount, error: pendingErr } = await supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('staff_id', user.id)
        .eq('status', 'pending')

      if (pendingErr) throw pendingErr

      // Bugün nöbet yoksa, en yakın nöbeti bul
      let nextShiftDate: string | null = null
      if (!todayData && upcomingData && upcomingData.length > 0) {
        nextShiftDate = upcomingData[0].date
      }

      const upcoming: UpcomingSlot[] = (upcomingData ?? [])
        .filter((s: any) => s.date !== today) // bugünü "Yaklaşan"dan çıkar
        .map((s: any) => ({
          id: s.id,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          department_name: s.departments?.name ?? null,
        }))

      setData({
        todaySlot: todayData
          ? {
              id: todayData.id,
              start_time: todayData.start_time,
              end_time: todayData.end_time,
              department_name: (todayData as any).departments?.name ?? null,
              schedule_title: (todayData as any).schedules?.title ?? null,
            }
          : null,
        weeklyCount: weekData?.length ?? 0,
        monthlyCount: monthData?.length ?? 0,
        pendingCount: pendingCount ?? 0,
        upcomingSlots: upcoming,
        nextShiftDate,
      })
    } catch (err: any) {
      console.error('Dashboard yüklenemedi:', err)
      setError('Veriler yüklenemedi. Yenilemek için dokunun.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, today, next7days])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ── Realtime: takas sonrası dashboard'u güncelle ─────────
  // staff_id filtresi yok — takas sonrası slot'un staff_id'si değişince
  // eski filter eşleşmiyordu. Herhangi bir slot değişiminde fetchDashboard çağrılır.
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`dashboard-slots-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'schedule_slots',
        },
        () => {
          setTimeout(() => fetchDashboard(), 500)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchDashboard])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchDashboard()
  }, [fetchDashboard])

  // ── Summary card data ───────────────────────────────────
  const summaryCards = [
    {
      label: 'Bu Hafta',
      value: data?.weeklyCount ?? 0,
      icon: 'calendar' as const,
      color: '#3B82F6',
      bg: '#1E3A8A',
    },
    {
      label: 'Bu Ay',
      value: data?.monthlyCount ?? 0,
      icon: 'stats-chart' as const,
      color: '#10B981',
      bg: '#064E3B',
    },
    {
      label: 'Bekleyen',
      value: data?.pendingCount ?? 0,
      icon: 'time' as const,
      color: '#F59E0B',
      bg: '#451A03',
    },
  ]

  // ── Quick action data ───────────────────────────────────
  const quickActions = [
    {
      icon: 'calendar-outline' as const,
      label: 'Programımı Gör',
      color: '#60A5FA',
      bg: '#1E3A8A',
      route: '/schedule',
    },
    {
      icon: 'sunny-outline' as const,
      label: 'İzin Talebi',
      color: '#34D399',
      bg: '#064E3B',
      route: '/requests',
    },
    {
      icon: 'swap-horizontal-outline' as const,
      label: 'Takas Talebi',
      color: '#C084FC',
      bg: '#2E1065',
      route: '/requests',
    },
    {
      icon: 'notifications-outline' as const,
      label: 'Bildirimler',
      color: '#FBBF24',
      bg: '#451A03',
      route: '/notifications',
    },
  ]

  // ── Render ──────────────────────────────────────────────
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
        <View className="bg-blue-700 px-5 pt-4 pb-7">
          {/* Row: greeting + sign-out */}
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-blue-200 text-sm font-medium mb-0.5">
                Merhaba 👋
              </Text>
              <Text
                className="text-white text-2xl font-bold leading-tight"
                numberOfLines={1}
              >
                {profile?.fullName ?? 'Personel'}
              </Text>
              <Text className="text-blue-300 text-xs mt-1.5 capitalize">
                {formatTurkishDate(today)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={signOut}
              className="bg-blue-800 rounded-xl p-2.5 mt-0.5"
              accessibilityLabel="Çıkış yap"
            >
              <Ionicons name="log-out-outline" size={20} color="#93C5FD" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ERROR BANNER ── */}
        {error && (
          <TouchableOpacity
            onPress={() => {
              setLoading(true)
              fetchDashboard()
            }}
            className="mx-4 mt-3 bg-red-900/70 border border-red-600 rounded-xl px-4 py-3 flex-row items-center gap-3"
            accessibilityRole="button"
          >
            <Ionicons name="alert-circle" size={18} color="#F87171" />
            <Text className="text-red-300 text-sm flex-1">{error}</Text>
            <Ionicons name="refresh-outline" size={16} color="#F87171" />
          </TouchableOpacity>
        )}

        {/* ── SKELETON ── */}
        {loading && !refreshing ? (
          <SkeletonDashboard />
        ) : (
          <View className="px-4 pt-4 pb-6 gap-4">

            {/* ── TODAY CARD ── */}
            <Card
              padding="sm"
              className="overflow-hidden"
              style={{
                borderLeftWidth: 5,
                borderLeftColor: data?.todaySlot ? '#22C55E' : '#475569',
              }}
            >
              {data?.todaySlot ? (
                <View className="px-1 py-1">
                  <Text className="text-green-400 font-semibold text-sm mb-1">
                    Bugün Nöbetiniz Var 🏥
                  </Text>
                  <Text className="text-white font-bold text-3xl tracking-tight">
                    {formatTime(data.todaySlot.start_time)} –{' '}
                    {formatTime(data.todaySlot.end_time)}
                  </Text>
                  {data.todaySlot.department_name && (
                    <View className="flex-row items-center gap-1.5 mt-2">
                      <Ionicons
                        name="business-outline"
                        size={13}
                        color="#94A3B8"
                      />
                      <Text className="text-slate-400 text-sm">
                        {data.todaySlot.department_name}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="px-1 py-1">
                  <Text className="text-slate-400 font-semibold text-sm mb-1">
                    Bugün Nöbetiniz Yok
                  </Text>
                  {data?.nextShiftDate ? (
                    <Text className="text-slate-500 text-xs">
                      Sonraki nöbet:{' '}
                      <Text className="text-blue-400">
                        {formatTurkishDate(data.nextShiftDate)}
                      </Text>
                    </Text>
                  ) : (
                    <Text className="text-slate-500 text-xs">
                      Yaklaşan nöbet bulunmuyor
                    </Text>
                  )}
                </View>
              )}
            </Card>

            {/* ── SUMMARY CARDS (horizontal scroll) ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 pr-4"
            >
              {summaryCards.map((card) => (
                <View
                  key={card.label}
                  className="bg-white rounded-xl p-4 shadow-sm items-center justify-center gap-2"
                  style={{ width: 120, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: card.bg }}
                  >
                    <Ionicons name={card.icon} size={20} color={card.color} />
                  </View>
                  <Text
                    className="text-slate-800 text-3xl font-bold"
                  >
                    {card.value}
                  </Text>
                  <Text className="text-slate-500 text-xs text-center leading-4">
                    {card.label}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* ── UPCOMING SHIFTS ── */}
            <View>
              {/* Section header */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white text-base font-bold">
                  Yaklaşan Nöbetler
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/schedule' as '/')}
                  accessibilityRole="button"
                >
                  <Text className="text-blue-400 text-sm font-medium">
                    Tümünü Gör
                  </Text>
                </TouchableOpacity>
              </View>

              {!data || data.upcomingSlots.length === 0 ? (
                /* Empty state */
                <View className="bg-slate-800 border border-slate-700 rounded-2xl items-center justify-center py-8 gap-2">
                  <Ionicons
                    name="calendar-outline"
                    size={36}
                    color="#475569"
                  />
                  <Text className="text-slate-400 text-sm text-center">
                    Yaklaşan nöbetiniz bulunmuyor
                  </Text>
                  <Text className="text-slate-600 text-xs text-center px-8 leading-5">
                    Önümüzdeki 7 gün için atanmış nöbet yok
                  </Text>
                </View>
              ) : (
                /* List */
                <View className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                  <FlatList
                    data={data.upcomingSlots}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item: slot, index }) => {
                      const { day, month } = formatShortDate(slot.date)
                      const isLast = index === data.upcomingSlots.length - 1
                      return (
                        <TouchableOpacity
                          onPress={() => router.push('/schedule' as any)}
                          activeOpacity={0.7}
                          className="flex-row items-center px-4 py-3"
                          accessibilityRole="button"
                        >
                          {/* Date box */}
                          <View className="w-12 h-14 bg-blue-700 rounded-xl items-center justify-center mr-3">
                            <Text className="text-white font-bold text-lg leading-none">
                              {day}
                            </Text>
                            <Text className="text-blue-300 text-xs font-semibold mt-0.5">
                              {month}
                            </Text>
                          </View>

                          {/* Info */}
                          <View className="flex-1">
                            <Text className="text-white text-sm font-semibold">
                              {formatTime(slot.start_time)} –{' '}
                              {formatTime(slot.end_time)}
                            </Text>
                            {slot.department_name && (
                              <Text className="text-slate-400 text-xs mt-0.5">
                                {slot.department_name}
                              </Text>
                            )}
                          </View>

                          {/* Chevron */}
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color="#475569"
                          />

                          {/* Separator */}
                          {!isLast && (
                            <View
                              className="absolute bottom-0 left-4 right-4 h-px bg-slate-700"
                              pointerEvents="none"
                            />
                          )}
                        </TouchableOpacity>
                      )
                    }}
                  />
                </View>
              )}
            </View>

            {/* ── QUICK ACTIONS (2×2 grid) ── */}
            <View>
              <Text className="text-white text-base font-bold mb-3">
                Hızlı Eylemler
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.label}
                    onPress={() => router.push(action.route as any)}
                    style={{ width: '47%' }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                  >
                    <Card padding="sm" className="items-center justify-center gap-2 py-4">
                      <View
                        className="w-12 h-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: action.bg }}
                      >
                        <Ionicons
                          name={action.icon}
                          size={24}
                          color={action.color}
                        />
                      </View>
                      <Text className="text-white text-sm font-semibold text-center leading-4">
                        {action.label}
                      </Text>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
