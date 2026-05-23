import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase/client'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TabKey = 'leave' | 'swap'

type LeaveType = 'annual' | 'sick' | 'unpaid' | 'maternity' | 'administrative'
type LeaveStatus = 'pending' | 'approved' | 'rejected'

interface LeaveRequest {
  id: string
  staff_id: string
  institution_id: string
  type: LeaveType
  start_date: string
  end_date: string
  reason: string | null
  status: LeaveStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  reviewed_by_profile?: { full_name: string } | null
}

interface ShiftSlot {
  id: string
  date: string
  start_time: string
  end_time: string
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const LEAVE_TYPE_CONFIG: Record<LeaveType, { label: string; color: string; bg: string; border: string }> = {
  annual:         { label: 'Yıllık İzin',   color: '#60A5FA', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  sick:           { label: 'Rapor',          color: '#FB923C', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
  unpaid:         { label: 'Ücretsiz İzin',  color: '#94A3B8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' },
  maternity:      { label: 'Doğum İzni',     color: '#F472B6', bg: 'rgba(244,114,182,0.15)', border: 'rgba(244,114,182,0.3)' },
  administrative: { label: 'İdari İzin',     color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)' },
}

const STATUS_CONFIG: Record<LeaveStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'Bekliyor',    color: '#FBBF24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
  approved: { label: 'Onaylandı',   color: '#34D399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' },
  rejected: { label: 'Reddedildi',  color: '#F87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)' },
}

const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'unpaid', 'maternity', 'administrative']

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatDateTurkish(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]}`
}

function formatDateTurkishFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function calcDaysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const diff = e.getTime() - s.getTime()
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isFutureDate(dateStr: string): boolean {
  const today = toDateStr(new Date())
  return dateStr >= today
}

function formatTime(t: string): string {
  return t.slice(0, 5)
}

// ─────────────────────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────────────────────

function useToast() {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const translateY = useRef(new Animated.Value(-60)).current
  const opacity = useRef(new Animated.Value(0)).current
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((msg: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setMessage(msg)
    setVisible(true)
    translateY.setValue(-60)
    opacity.setValue(0)

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()

    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -60, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setVisible(false))
    }, 3000)
  }, [translateY, opacity])

  return { visible, message, translateY, opacity, show }
}

function Toast({
  visible,
  message,
  translateY,
  opacity,
}: {
  visible: boolean
  message: string
  translateY: Animated.Value
  opacity: Animated.Value
}) {
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
        borderColor: '#22C55E',
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
      <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
      <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '600' }}>
        {message}
      </Text>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────
// Simple Date Picker (cross-platform, no extra deps)
// ─────────────────────────────────────────────────────────────

interface SimpleDatePickerProps {
  visible: boolean
  currentDate: Date
  minimumDate?: Date
  onSelect: (date: Date) => void
  onClose: () => void
}

function SimpleDatePicker({ visible, currentDate, minimumDate, onSelect, onClose }: SimpleDatePickerProps) {
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())

  useEffect(() => {
    if (visible) {
      setViewYear(currentDate.getFullYear())
      setViewMonth(currentDate.getMonth())
    }
  }, [visible, currentDate])

  const DAY_HEADERS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDOW = new Date(viewYear, viewMonth, 1).getDay()
  const offset = firstDOW === 0 ? 6 : firstDOW - 1

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  const selectedStr = toDateStr(currentDate)
  const todayStr = toDateStr(new Date())
  const minStr = minimumDate ? toDateStr(minimumDate) : undefined

  function handlePrev() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1)
      setViewMonth(11)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function handleNext() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1)
      setViewMonth(0)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  if (!visible) return null

  return (
    <Modal visible transparent animationType="fade">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={{
            backgroundColor: '#1E293B',
            borderRadius: 20,
            padding: 20,
            width: 340,
            borderWidth: 1,
            borderColor: '#334155',
          }}>
            {/* Month nav */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <TouchableOpacity onPress={handlePrev} style={{ padding: 8 }}>
                <Ionicons name="chevron-back" size={20} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }}>
                {TURKISH_MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={handleNext} style={{ padding: 8 }}>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {DAY_HEADERS.map((h) => (
                <View key={h} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{h}</Text>
                </View>
              ))}
            </View>

            {/* Days grid */}
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 4 }}>
                {row.map((day, colIdx) => {
                  if (day === null) {
                    return <View key={`${rowIdx}-${colIdx}`} style={{ flex: 1, height: 40 }} />
                  }
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isSelected = dateStr === selectedStr
                  const isToday = dateStr === todayStr
                  const isDisabled = minStr ? dateStr < minStr : false

                  return (
                    <TouchableOpacity
                      key={`${rowIdx}-${colIdx}`}
                      disabled={isDisabled}
                      onPress={() => {
                        onSelect(new Date(dateStr + 'T00:00:00'))
                        onClose()
                      }}
                      style={{
                        flex: 1,
                        height: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? '#3B82F6' : isToday ? '#1E3A8A' : 'transparent',
                      }}>
                        <Text style={{
                          color: isDisabled ? '#334155' : isSelected ? '#FFFFFF' : isToday ? '#93C5FD' : '#F8FAFC',
                          fontSize: 14,
                          fontWeight: isSelected || isToday ? '700' : '400',
                        }}>
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Badge Component (inline for precise control)
// ─────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: LeaveType }) {
  const config = LEAVE_TYPE_CONFIG[type]
  return (
    <View style={{
      backgroundColor: config.bg,
      borderWidth: 1,
      borderColor: config.border,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    }}>
      <Text style={{ color: config.color, fontSize: 11, fontWeight: '600' }}>{config.label}</Text>
    </View>
  )
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <View style={{
      backgroundColor: config.bg,
      borderWidth: 1,
      borderColor: config.border,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    }}>
      <Text style={{ color: config.color, fontSize: 11, fontWeight: '600' }}>{config.label}</Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Summary Box
// ─────────────────────────────────────────────────────────────

function SummaryBox({
  count,
  label,
  color,
  bgColor,
}: {
  count: number
  label: string
  color: string
  bgColor: string
}) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: bgColor,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
    }}>
      <Text style={{ color, fontSize: 26, fontWeight: '800' }}>{count}</Text>
      <Text style={{ color, fontSize: 11, fontWeight: '600', marginTop: 2, opacity: 0.8 }}>{label}</Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Leave Request Card
// ─────────────────────────────────────────────────────────────

interface LeaveCardProps {
  item: LeaveRequest
  onCancel: (id: string) => void
  cancellingId: string | null
}

function LeaveRequestCard({ item, onCancel, cancellingId }: LeaveCardProps) {
  const days = calcDaysBetween(item.start_date, item.end_date)
  const canCancel = item.status === 'pending' && isFutureDate(item.start_date)

  function handleCancel() {
    Alert.alert(
      'Talebi İptal Et',
      'Bu talebi iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'İptal Et', style: 'destructive', onPress: () => onCancel(item.id) },
      ]
    )
  }

  return (
    <View
      style={{
        backgroundColor: '#1E293B',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Top row: badges */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TypeBadge type={item.type} />
        <StatusBadge status={item.status} />
      </View>

      {/* Date range */}
      <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginTop: 12 }}>
        {formatDateTurkish(item.start_date)} — {formatDateTurkishFull(item.end_date)}{' '}
        <Text style={{ color: '#64748B', fontWeight: '400' }}>({days} gün)</Text>
      </Text>

      {/* Bottom row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        {item.status === 'approved' && item.reviewed_by_profile ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-circle" size={14} color="#34D399" />
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>
              Onaylayan: {item.reviewed_by_profile.full_name}
            </Text>
          </View>
        ) : item.status === 'rejected' && item.reviewed_by_profile ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="close-circle" size={14} color="#F87171" />
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>
              Reddeden: {item.reviewed_by_profile.full_name}
            </Text>
          </View>
        ) : (
          <View />
        )}

        {canCancel && (
          <TouchableOpacity
            onPress={handleCancel}
            disabled={cancellingId === item.id}
            style={{
              backgroundColor: 'rgba(248,113,113,0.15)',
              borderWidth: 1,
              borderColor: 'rgba(248,113,113,0.3)',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {cancellingId === item.id ? (
              <ActivityIndicator size="small" color="#F87171" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={13} color="#F87171" />
                <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '600' }}>İptal Et</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Reason if exists */}
      {item.reason ? (
        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 8, lineHeight: 18 }} numberOfLines={2}>
          {item.reason}
        </Text>
      ) : null}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// New Leave Request Modal
// ─────────────────────────────────────────────────────────────

interface NewLeaveModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  toast: ReturnType<typeof useToast>
}

function NewLeaveRequestModal({ visible, onClose, onSuccess, toast }: NewLeaveModalProps) {
  const { user, profile } = useAuth()

  const [selectedType, setSelectedType] = useState<LeaveType>('annual')
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [conflictSlots, setConflictSlots] = useState<ShiftSlot[]>([])
  const [loadingConflicts, setLoadingConflicts] = useState(false)

  // Reset form on open
  useEffect(() => {
    if (visible) {
      setSelectedType('annual')
      setStartDate(new Date())
      setEndDate(new Date())
      setReason('')
      setConflictSlots([])
    }
  }, [visible])

  // Check for conflicting shifts
  useEffect(() => {
    if (!visible || !user) return

    const startStr = toDateStr(startDate)
    const endStr = toDateStr(endDate)

    if (startStr > endStr) return

    async function checkConflicts() {
      setLoadingConflicts(true)
      try {
        const { data } = await supabase
          .from('schedule_slots')
          .select('id, date, start_time, end_time')
          .eq('staff_id', user!.id)
          .eq('status', 'active')
          .gte('date', startStr)
          .lte('date', endStr)
          .order('date', { ascending: true })

        setConflictSlots(data ?? [])
      } catch {
        setConflictSlots([])
      } finally {
        setLoadingConflicts(false)
      }
    }

    checkConflicts()
  }, [visible, user, startDate, endDate])

  const dayCount = useMemo(() => {
    const s = toDateStr(startDate)
    const e = toDateStr(endDate)
    if (s > e) return 0
    return calcDaysBetween(s, e)
  }, [startDate, endDate])

  async function handleSubmit() {
    if (!user || !profile) return

    const startStr = toDateStr(startDate)
    const endStr = toDateStr(endDate)

    if (startStr > endStr) {
      Alert.alert('Hata', 'Başlangıç tarihi bitiş tarihinden sonra olamaz.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          staff_id: user.id,
          institution_id: profile.institutionId,
          type: selectedType,
          start_date: startStr,
          end_date: endStr,
          reason: reason.trim() || null,
          status: 'pending',
        })

      if (error) {
        Alert.alert('Hata', `İzin talebi oluşturulamadı: ${error.message}`)
        return
      }

      onClose()
      onSuccess()
      toast.show('İzin talebiniz iletildi')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu'
      Alert.alert('Hata', message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
        {/* Header */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#1E293B' }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#334155',
          }}>
            <Text style={{ color: '#F8FAFC', fontSize: 20, fontWeight: '700' }}>Yeni İzin Talebi</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#334155',
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Leave Type Selection */}
            <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
              İzin Tipi
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {LEAVE_TYPES.map((type) => {
                const config = LEAVE_TYPE_CONFIG[type]
                const isActive = selectedType === type
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedType(type)}
                    style={{
                      backgroundColor: isActive ? config.bg : '#1E293B',
                      borderWidth: 1.5,
                      borderColor: isActive ? config.color : '#334155',
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{
                      color: isActive ? config.color : '#94A3B8',
                      fontSize: 13,
                      fontWeight: isActive ? '700' : '500',
                    }}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* 2. Start Date */}
            <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              Başlangıç Tarihi
            </Text>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              style={{
                backgroundColor: '#1E293B',
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#F1F5F9', fontSize: 15 }}>
                {formatDateTurkishFull(toDateStr(startDate))}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>

            {/* 3. End Date */}
            <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              Bitiş Tarihi
            </Text>
            <TouchableOpacity
              onPress={() => setShowEndPicker(true)}
              style={{
                backgroundColor: '#1E293B',
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#F1F5F9', fontSize: 15 }}>
                {formatDateTurkishFull(toDateStr(endDate))}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>

            {/* 4. Day count info box */}
            {dayCount > 0 && (
              <View style={{
                backgroundColor: 'rgba(251,191,36,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(251,191,36,0.25)',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}>
                <Ionicons name="information-circle" size={18} color="#FBBF24" />
                <Text style={{ color: '#FBBF24', fontSize: 13, fontWeight: '600' }}>
                  {dayCount} gün seçildi
                </Text>
              </View>
            )}

            {/* 5. Shift conflict warning */}
            {loadingConflicts ? (
              <View style={{ marginBottom: 16, paddingVertical: 8 }}>
                <ActivityIndicator size="small" color="#FB923C" />
              </View>
            ) : conflictSlots.length > 0 ? (
              <View style={{
                backgroundColor: 'rgba(249,115,22,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(249,115,22,0.25)',
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="warning" size={16} color="#FB923C" />
                  <Text style={{ color: '#FB923C', fontSize: 13, fontWeight: '700' }}>
                    Bu tarihlerde {conflictSlots.length} nöbetiniz var:
                  </Text>
                </View>
                {conflictSlots.map((slot) => (
                  <Text key={slot.id} style={{ color: '#FDBA74', fontSize: 12, marginLeft: 22, marginTop: 2 }}>
                    • {formatDateTurkish(slot.date)} {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* 6. Reason */}
            <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              Açıklama
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Açıklama ekleyin (opsiyonel)"
              placeholderTextColor="#475569"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                backgroundColor: '#1E293B',
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: '#F1F5F9',
                fontSize: 14,
                minHeight: 100,
              }}
            />
          </ScrollView>

          {/* Fixed bottom button */}
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#0F172A' }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || dayCount === 0}
                style={{
                  backgroundColor: submitting || dayCount === 0 ? '#1E3A8A' : '#3B82F6',
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: submitting || dayCount === 0 ? 0.6 : 1,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Talebi Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>

        {/* Date pickers */}
        <SimpleDatePicker
          visible={showStartPicker}
          currentDate={startDate}
          onSelect={(d) => {
            setStartDate(d)
            // Auto-adjust end date if it's before start
            if (d > endDate) setEndDate(d)
          }}
          onClose={() => setShowStartPicker(false)}
        />
        <SimpleDatePicker
          visible={showEndPicker}
          currentDate={endDate}
          minimumDate={startDate}
          onSelect={setEndDate}
          onClose={() => setShowEndPicker(false)}
        />
      </View>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Swap Placeholder (Part 16B stub)
// ─────────────────────────────────────────────────────────────

function SwapTabContent() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 16 }}>
      <View style={{
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 24,
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Ionicons name="swap-horizontal-outline" size={36} color="#3B82F6" />
      </View>
      <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
        Takas Talepleri Yakında
      </Text>
      <Text style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
        Vardiya takas işlemleri bu sekmeden yapılacak.
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────

export default function RequestsScreen() {
  const { user } = useAuth()
  const params = useLocalSearchParams<{ tab?: string }>()

  const [selectedTab, setSelectedTab] = useState<TabKey>('leave')
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const toast = useToast()

  // URL param: ?tab=swap
  useEffect(() => {
    if (params.tab === 'swap') {
      setSelectedTab('swap')
    }
  }, [params.tab])

  // Load leave requests
  const loadLeaveRequests = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, reviewed_by_profile:profiles!reviewed_by(full_name)')
        .eq('staff_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('İzin talepleri yüklenemedi:', error.message)
        return
      }
      setLeaveRequests((data as LeaveRequest[]) ?? [])
    } catch (err) {
      console.error('İzin talepleri yüklenemedi:', err)
    }
  }, [user])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadLeaveRequests()
      setLoading(false)
    }
    init()
  }, [loadLeaveRequests])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadLeaveRequests()
    setRefreshing(false)
  }, [loadLeaveRequests])

  // Cancel handler
  async function handleCancel(id: string) {
    setCancellingId(id)
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected' as LeaveStatus })
        .eq('id', id)
        .eq('staff_id', user!.id)
        .eq('status', 'pending')

      if (error) {
        Alert.alert('Hata', `İptal işlemi başarısız: ${error.message}`)
        return
      }

      await loadLeaveRequests()
      toast.show('Talep iptal edildi')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu'
      Alert.alert('Hata', message)
    } finally {
      setCancellingId(null)
    }
  }

  // Summary counts
  const pendingCount = leaveRequests.filter((r) => r.status === 'pending').length
  const approvedCount = leaveRequests.filter((r) => r.status === 'approved').length
  const rejectedCount = leaveRequests.filter((r) => r.status === 'rejected').length

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }} edges={['top']}>
      {/* Toast overlay */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        translateY={toast.translateY}
        opacity={toast.opacity}
      />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800' }}>Talepler</Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>İzin ve takas taleplerinizi yönetin</Text>
      </View>

      {/* Tab Bar */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: '#1E293B',
        borderRadius: 14,
        padding: 4,
      }}>
        <TouchableOpacity
          onPress={() => setSelectedTab('leave')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 11,
            alignItems: 'center',
            backgroundColor: selectedTab === 'leave' ? '#0F172A' : 'transparent',
          }}
        >
          <Text style={{
            color: selectedTab === 'leave' ? '#3B82F6' : '#64748B',
            fontSize: 14,
            fontWeight: selectedTab === 'leave' ? '700' : '500',
          }}>
            İzin Talepleri
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedTab('swap')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 11,
            alignItems: 'center',
            backgroundColor: selectedTab === 'swap' ? '#0F172A' : 'transparent',
          }}
        >
          <Text style={{
            color: selectedTab === 'swap' ? '#3B82F6' : '#64748B',
            fontSize: 14,
            fontWeight: selectedTab === 'swap' ? '700' : '500',
          }}>
            Takas Talepleri
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {selectedTab === 'leave' ? (
        loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            data={leaveRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3B82F6"
                colors={['#3B82F6']}
              />
            }
            ListHeaderComponent={
              <View>
                {/* Summary Boxes */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <SummaryBox count={pendingCount} label="Bekleyen" color="#FBBF24" bgColor="rgba(251,191,36,0.1)" />
                  <SummaryBox count={approvedCount} label="Onaylanan" color="#34D399" bgColor="rgba(52,211,153,0.1)" />
                  <SummaryBox count={rejectedCount} label="Reddedilen" color="#F87171" bgColor="rgba(248,113,113,0.1)" />
                </View>

                {/* New Request Button */}
                <TouchableOpacity
                  onPress={() => setModalVisible(true)}
                  style={{
                    backgroundColor: '#3B82F6',
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                    Yeni İzin Talebi
                  </Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <LeaveRequestCard
                item={item}
                onCancel={handleCancel}
                cancellingId={cancellingId}
              />
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
                <Text style={{ fontSize: 48 }}>🏖️</Text>
                <Text style={{ color: '#94A3B8', fontSize: 15, fontWeight: '600' }}>
                  Henüz izin talebiniz yok
                </Text>
                <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center' }}>
                  Yukarıdaki butona tıklayarak yeni bir izin talebi oluşturabilirsiniz.
                </Text>
              </View>
            }
          />
        )
      ) : (
        <SwapTabContent />
      )}

      {/* New Leave Request Modal */}
      <NewLeaveRequestModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={loadLeaveRequests}
        toast={toast}
      />
    </SafeAreaView>
  )
}
