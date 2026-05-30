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
import { useSwapRequests } from '@/hooks/useSwapRequests'
import type { SwapRequest, SwapStatus } from '@/hooks/useSwapRequests'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TabKey = 'leave' | 'swap'
type SwapSubTab = 'sent' | 'received'

type LeaveType = 'annual' | 'sick' | 'unpaid' | 'maternity' | 'administrative'
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

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
  cancel_requested?: boolean
  cancel_reason?: string | null
  reviewed_by_profile?: { full_name: string } | null
}

interface ShiftSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  departments?: { name: string } | null
}

interface StaffMember {
  id: string
  full_name: string
  role?: string
  department_id?: string | null
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const TURKISH_WEEKDAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

const LEAVE_TYPE_CONFIG: Record<LeaveType, { label: string; color: string; bg: string; border: string }> = {
  annual:         { label: 'Yıllık İzin',   color: '#60A5FA', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  sick:           { label: 'Rapor',          color: '#FB923C', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
  unpaid:         { label: 'Ücretsiz İzin',  color: '#94A3B8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' },
  maternity:      { label: 'Doğum İzni',     color: '#F472B6', bg: 'rgba(244,114,182,0.15)', border: 'rgba(244,114,182,0.3)' },
  administrative: { label: 'İdari İzin',     color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)' },
}

const LEAVE_STATUS_CONFIG: Record<LeaveStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'Bekliyor',      color: '#FBBF24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
  approved:  { label: 'Onaylandı',    color: '#34D399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' },
  rejected:  { label: 'Reddedildi',   color: '#F87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)' },
  cancelled: { label: 'İptal Edildi', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' },
}

const SWAP_STATUS_CONFIG: Record<SwapStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:              { label: 'Bekliyor',                 color: '#FBBF24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
  approved_by_receiver: { label: 'Admin Onayı Bekleniyor',  color: '#60A5FA', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  approved_by_admin:    { label: 'Onaylandı',               color: '#34D399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' },
  rejected:             { label: 'Reddedildi',              color: '#F87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)' },
  cancelled:            { label: 'İptal Edildi',            color: '#94A3B8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' },
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

function formatDateWithDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]} ${TURKISH_WEEKDAYS_SHORT[d.getDay()]}.`
}

function formatDateWithDayFull(dateStr: string): string {
  const DAYS_FULL = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${TURKISH_MONTHS[d.getMonth()]} ${DAYS_FULL[d.getDay()]}`
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ─────────────────────────────────────────────────────────────
// Toast Hook & Component
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
// Simple Date Picker
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => {
                if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
                else setViewMonth(viewMonth - 1)
              }} style={{ padding: 8 }}>
                <Ionicons name="chevron-back" size={20} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }}>
                {TURKISH_MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={() => {
                if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
                else setViewMonth(viewMonth + 1)
              }} style={{ padding: 8 }}>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {DAY_HEADERS.map((h) => (
                <View key={h} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{h}</Text>
                </View>
              ))}
            </View>

            {rows.map((row, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 4 }}>
                {row.map((day, colIdx) => {
                  if (day === null) return <View key={`${rowIdx}-${colIdx}`} style={{ flex: 1, height: 40 }} />
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isSelected = dateStr === selectedStr
                  const isToday = dateStr === todayStr
                  const isDisabled = minStr ? dateStr < minStr : false

                  return (
                    <TouchableOpacity
                      key={`${rowIdx}-${colIdx}`}
                      disabled={isDisabled}
                      onPress={() => { onSelect(new Date(dateStr + 'T00:00:00')); onClose() }}
                      style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <View style={{
                        width: 34, height: 34, borderRadius: 17,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isSelected ? '#3B82F6' : isToday ? '#1E3A8A' : 'transparent',
                      }}>
                        <Text style={{
                          color: isDisabled ? '#334155' : isSelected ? '#FFFFFF' : isToday ? '#93C5FD' : '#F8FAFC',
                          fontSize: 14, fontWeight: isSelected || isToday ? '700' : '400',
                        }}>{day}</Text>
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
// Badge Components
// ─────────────────────────────────────────────────────────────

function LeaveTypeBadge({ type }: { type: LeaveType }) {
  const config = LEAVE_TYPE_CONFIG[type]
  return (
    <View style={{ backgroundColor: config.bg, borderWidth: 1, borderColor: config.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: config.color, fontSize: 11, fontWeight: '600' }}>{config.label}</Text>
    </View>
  )
}

function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const config = LEAVE_STATUS_CONFIG[status]
  return (
    <View style={{ backgroundColor: config.bg, borderWidth: 1, borderColor: config.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: config.color, fontSize: 11, fontWeight: '600' }}>{config.label}</Text>
    </View>
  )
}

function SwapStatusBadge({ status }: { status: SwapStatus }) {
  const config = SWAP_STATUS_CONFIG[status]
  return (
    <View style={{ backgroundColor: config.bg, borderWidth: 1, borderColor: config.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: config.color, fontSize: 11, fontWeight: '600' }}>{config.label}</Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Summary Box
// ─────────────────────────────────────────────────────────────

function SummaryBox({ count, label, color, bgColor }: { count: number; label: string; color: string; bgColor: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bgColor, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' }}>
      <Text style={{ color, fontSize: 26, fontWeight: '800' }}>{count}</Text>
      <Text style={{ color, fontSize: 11, fontWeight: '600', marginTop: 2, opacity: 0.8 }}>{label}</Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Leave Request Card
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Cancel Request Modal (for approved leave cancellation)
// ─────────────────────────────────────────────────────────────

function CancelRequestModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean; onClose: () => void; onSubmit: (reason: string) => void; loading: boolean
}) {
  const [reason, setReason] = useState('')

  useEffect(() => { if (visible) setReason('') }, [visible])

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 24, width: 340, borderWidth: 1, borderColor: '#334155' }}>
              <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>İptal Talebi Gönder</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>Onaylanan izni iptal ettirmek için talep gönderin. Admin inceleyecektir.</Text>
              <TextInput
                value={reason} onChangeText={setReason}
                placeholder="İptal sebebi (opsiyonel)" placeholderTextColor="#475569"
                multiline numberOfLines={3} textAlignVertical="top"
                style={{ backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#F1F5F9', fontSize: 14, minHeight: 80, marginBottom: 16 }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={onClose} disabled={loading}
                  style={{ flex: 1, borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600' }}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onSubmit(reason.trim())} disabled={loading}
                  style={{ flex: 1, backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
                  {loading ? <ActivityIndicator size="small" color="#FFF" /> : (
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Talebi Gönder</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Leave Request Card
// ─────────────────────────────────────────────────────────────

function LeaveRequestCard({ item, onCancel, cancellingId, onCancelRequest, cancelRequestingId }: {
  item: LeaveRequest
  onCancel: (id: string) => void
  cancellingId: string | null
  onCancelRequest: (id: string, reason: string) => void
  cancelRequestingId: string | null
}) {
  const days = calcDaysBetween(item.start_date, item.end_date)
  const canCancel = item.status === 'pending' && isFutureDate(item.start_date)
  const canRequestCancel = item.status === 'approved' && !item.cancel_requested
  const [cancelModalVisible, setCancelModalVisible] = useState(false)

  return (
    <View style={{ backgroundColor: '#1E293B', borderRadius: 16, borderWidth: 1, borderColor: '#334155', padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <LeaveTypeBadge type={item.type} />
        <LeaveStatusBadge status={item.status} />
        {item.cancel_requested && (
          <View style={{ backgroundColor: 'rgba(251,146,60,0.15)', borderWidth: 1, borderColor: 'rgba(251,146,60,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: '#FB923C', fontSize: 11, fontWeight: '600' }}>İptal Talebi Gönderildi</Text>
          </View>
        )}
      </View>

      <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginTop: 12 }}>
        {formatDateTurkish(item.start_date)} — {formatDateTurkishFull(item.end_date)}{' '}
        <Text style={{ color: '#64748B', fontWeight: '400' }}>({days} gün)</Text>
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        {item.status === 'approved' && item.reviewed_by_profile ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="checkmark-circle" size={14} color="#34D399" />
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>Onaylayan: {item.reviewed_by_profile.full_name}</Text>
          </View>
        ) : item.status === 'rejected' && item.reviewed_by_profile ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="close-circle" size={14} color="#F87171" />
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>Reddeden: {item.reviewed_by_profile.full_name}</Text>
          </View>
        ) : <View />}

        {canCancel && (
          <TouchableOpacity
            onPress={() => Alert.alert('Talebi İptal Et', 'Bu talebi iptal etmek istediğinizden emin misiniz?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'İptal Et', style: 'destructive', onPress: () => onCancel(item.id) },
            ])}
            disabled={cancellingId === item.id}
            style={{ backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}
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

      {canRequestCancel && (
        <TouchableOpacity
          onPress={() => setCancelModalVisible(true)}
          disabled={cancelRequestingId === item.id}
          style={{ marginTop: 10, borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {cancelRequestingId === item.id ? (
            <ActivityIndicator size="small" color="#F87171" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={14} color="#F87171" />
              <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '600' }}>İptal Talebi Gönder</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {item.reason ? (
        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 8, lineHeight: 18 }} numberOfLines={2}>{item.reason}</Text>
      ) : null}

      <CancelRequestModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        loading={cancelRequestingId === item.id}
        onSubmit={(reason) => { setCancelModalVisible(false); onCancelRequest(item.id, reason) }}
      />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// New Leave Request Modal
// ─────────────────────────────────────────────────────────────

function NewLeaveRequestModal({ visible, onClose, onSuccess, toast }: {
  visible: boolean; onClose: () => void; onSuccess: () => void; toast: ReturnType<typeof useToast>
}) {
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

  useEffect(() => {
    if (visible) { setSelectedType('annual'); setStartDate(new Date()); setEndDate(new Date()); setReason(''); setConflictSlots([]) }
  }, [visible])

  useEffect(() => {
    if (!visible || !user) return
    const startStr = toDateStr(startDate)
    const endStr = toDateStr(endDate)
    if (startStr > endStr) return

    async function checkConflicts() {
      setLoadingConflicts(true)
      try {
        const { data } = await supabase.from('schedule_slots').select('id, date, start_time, end_time')
          .eq('staff_id', user!.id).eq('status', 'active').gte('date', startStr).lte('date', endStr).order('date', { ascending: true })
        setConflictSlots(data ?? [])
      } catch { setConflictSlots([]) } finally { setLoadingConflicts(false) }
    }
    checkConflicts()
  }, [visible, user, startDate, endDate])

  const dayCount = useMemo(() => {
    const s = toDateStr(startDate); const e = toDateStr(endDate)
    if (s > e) return 0
    return calcDaysBetween(s, e)
  }, [startDate, endDate])

  async function handleSubmit() {
    if (!user || !profile) return
    const startStr = toDateStr(startDate); const endStr = toDateStr(endDate)
    if (startStr > endStr) { Alert.alert('Hata', 'Başlangıç tarihi bitiş tarihinden sonra olamaz.'); return }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('leave_requests').insert({
        staff_id: user.id, institution_id: profile.institutionId, type: selectedType,
        start_date: startStr, end_date: endStr, reason: reason.trim() || null, status: 'pending',
      })
      if (error) { Alert.alert('Hata', `İzin talebi oluşturulamadı: ${error.message}`); return }
      onClose(); onSuccess(); toast.show('İzin talebiniz iletildi')
    } catch (err: unknown) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu')
    } finally { setSubmitting(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#1E293B' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#334155' }}>
            <Text style={{ color: '#F8FAFC', fontSize: 20, fontWeight: '700' }}>Yeni İzin Talebi</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#334155', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>İzin Tipi</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {LEAVE_TYPES.map((type) => {
                const config = LEAVE_TYPE_CONFIG[type]; const isActive = selectedType === type
                return (
                  <TouchableOpacity key={type} onPress={() => setSelectedType(type)}
                    style={{ backgroundColor: isActive ? config.bg : '#1E293B', borderWidth: 1.5, borderColor: isActive ? config.color : '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={{ color: isActive ? config.color : '#94A3B8', fontSize: 13, fontWeight: isActive ? '700' : '500' }}>{config.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Başlangıç Tarihi</Text>
            <TouchableOpacity onPress={() => setShowStartPicker(true)}
              style={{ backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: '#F1F5F9', fontSize: 15 }}>{formatDateTurkishFull(toDateStr(startDate))}</Text>
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>

            <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Bitiş Tarihi</Text>
            <TouchableOpacity onPress={() => setShowEndPicker(true)}
              style={{ backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: '#F1F5F9', fontSize: 15 }}>{formatDateTurkishFull(toDateStr(endDate))}</Text>
              <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>

            {dayCount > 0 && (
              <View style={{ backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Ionicons name="information-circle" size={18} color="#FBBF24" />
                <Text style={{ color: '#FBBF24', fontSize: 13, fontWeight: '600' }}>{dayCount} gün seçildi</Text>
              </View>
            )}

            {loadingConflicts ? (
              <View style={{ marginBottom: 16, paddingVertical: 8 }}><ActivityIndicator size="small" color="#FB923C" /></View>
            ) : conflictSlots.length > 0 ? (
              <View style={{ backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="warning" size={16} color="#FB923C" />
                  <Text style={{ color: '#FB923C', fontSize: 13, fontWeight: '700' }}>Bu tarihlerde {conflictSlots.length} nöbetiniz var:</Text>
                </View>
                {conflictSlots.map((slot) => (
                  <Text key={slot.id} style={{ color: '#FDBA74', fontSize: 12, marginLeft: 22, marginTop: 2 }}>• {formatDateTurkish(slot.date)} {formatTime(slot.start_time)}–{formatTime(slot.end_time)}</Text>
                ))}
              </View>
            ) : null}

            <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Açıklama</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="Açıklama ekleyin (opsiyonel)" placeholderTextColor="#475569"
              multiline numberOfLines={4} textAlignVertical="top"
              style={{ backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: '#F1F5F9', fontSize: 14, minHeight: 100 }} />
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#0F172A' }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
              <TouchableOpacity onPress={handleSubmit} disabled={submitting || dayCount === 0}
                style={{ backgroundColor: submitting || dayCount === 0 ? '#1E3A8A' : '#3B82F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', opacity: submitting || dayCount === 0 ? 0.6 : 1 }}>
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Talebi Gönder</Text>}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>

        <SimpleDatePicker visible={showStartPicker} currentDate={startDate}
          onSelect={(d) => { setStartDate(d); if (d > endDate) setEndDate(d) }} onClose={() => setShowStartPicker(false)} />
        <SimpleDatePicker visible={showEndPicker} currentDate={endDate} minimumDate={startDate}
          onSelect={setEndDate} onClose={() => setShowEndPicker(false)} />
      </View>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════
// SWAP TAB — SECTION STARTS HERE
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// Swap Card
// ─────────────────────────────────────────────────────────────

interface SwapCardProps {
  item: SwapRequest
  isSentTab: boolean
  userId: string
  onCancelSwap: (id: string) => void
  onAcceptSwap: (id: string) => void
  onRejectSwap: (id: string) => void
  actionLoadingId: string | null
}

function SwapRequestCard({ item, isSentTab, userId, onCancelSwap, onAcceptSwap, onRejectSwap, actionLoadingId }: SwapCardProps) {
  const isLoading = actionLoadingId === item.id

  // Determine "my slot" and "other slot/person" based on perspective
  const isRequester = item.requester?.id === userId
  const mySlot = isRequester ? item.requester_slot : item.receiver_slot
  const otherSlot = isRequester ? item.receiver_slot : item.requester_slot
  const otherPerson = isRequester ? item.receiver : item.requester

  return (
    <View style={{
      backgroundColor: '#1E293B',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#334155',
      padding: 16,
      marginBottom: 12,
    }}>
      {/* Status badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <SwapStatusBadge status={item.status} />
      </View>

      {/* Two-column swap visualization */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Left column — My shift */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Benim Nöbetim
          </Text>
          {mySlot ? (
            <>
              <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '600' }}>
                {formatDateWithDay(mySlot.date)}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                {formatTime(mySlot.start_time)}–{formatTime(mySlot.end_time)}
              </Text>
              {mySlot.departments?.name && (
                <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                  {mySlot.departments.name}
                </Text>
              )}
            </>
          ) : (
            <Text style={{ color: '#475569', fontSize: 12 }}>—</Text>
          )}
        </View>

        {/* Center arrow */}
        <View style={{ width: 40, alignItems: 'center', justifyContent: 'center', paddingTop: 12 }}>
          <View style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: 'rgba(59,130,246,0.15)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="swap-horizontal" size={18} color="#3B82F6" />
          </View>
        </View>

        {/* Right column — Other person */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Karşı Taraf
          </Text>
          {otherPerson && (
            <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
              {otherPerson.full_name}
            </Text>
          )}
          {otherSlot ? (
            <>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                {formatDateWithDay(otherSlot.date)}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 1 }}>
                {formatTime(otherSlot.start_time)}–{formatTime(otherSlot.end_time)}
              </Text>
            </>
          ) : (
            <Text style={{ color: '#475569', fontSize: 12 }}>—</Text>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 12 }} />

      {/* Bottom actions */}
      {isSentTab ? (
        // SENT TAB actions
        <>
          {item.status === 'pending' && (
            <TouchableOpacity
              onPress={() => Alert.alert('Talebi İptal Et', 'Bu takas talebini iptal etmek istediğinizden emin misiniz?', [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'İptal Et', style: 'destructive', onPress: () => onCancelSwap(item.id) },
              ])}
              disabled={isLoading}
              style={{
                borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)', borderRadius: 12,
                paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 6,
              }}
            >
              {isLoading ? <ActivityIndicator size="small" color="#F87171" /> : (
                <>
                  <Ionicons name="close-circle-outline" size={16} color="#F87171" />
                  <Text style={{ color: '#F87171', fontSize: 13, fontWeight: '600' }}>İptal Et</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {item.status === 'approved_by_receiver' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 4 }}>
              <Ionicons name="time-outline" size={14} color="#60A5FA" />
              <Text style={{ color: '#60A5FA', fontSize: 12, fontWeight: '500' }}>Admin onayı bekleniyor</Text>
            </View>
          )}
          {item.status === 'rejected' && item.reject_reason && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 2 }}>
              <Ionicons name="information-circle-outline" size={14} color="#64748B" style={{ marginTop: 2 }} />
              <Text style={{ color: '#64748B', fontSize: 12, fontStyle: 'italic', flex: 1 }}>
                Red sebebi: {item.reject_reason}
              </Text>
            </View>
          )}
        </>
      ) : (
        // RECEIVED TAB actions
        <>
          {item.status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => onAcceptSwap(item.id)}
                disabled={isLoading}
                style={{
                  flex: 1, backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1,
                  borderColor: 'rgba(52,211,153,0.3)', borderRadius: 12,
                  paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'row', gap: 6,
                }}
              >
                {isLoading ? <ActivityIndicator size="small" color="#34D399" /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#34D399" />
                    <Text style={{ color: '#34D399', fontSize: 13, fontWeight: '600' }}>Kabul Et</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onRejectSwap(item.id)}
                disabled={isLoading}
                style={{
                  flex: 1, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
                  borderRadius: 12, paddingVertical: 10, alignItems: 'center',
                  justifyContent: 'center', flexDirection: 'row', gap: 6,
                }}
              >
                <Ionicons name="close-circle-outline" size={16} color="#F87171" />
                <Text style={{ color: '#F87171', fontSize: 13, fontWeight: '600' }}>Reddet</Text>
              </TouchableOpacity>
            </View>
          )}
          {item.status === 'approved_by_receiver' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 4 }}>
              <Ionicons name="checkmark-done" size={14} color="#60A5FA" />
              <Text style={{ color: '#60A5FA', fontSize: 12, fontWeight: '500' }}>Onayınız alındı, admin onayı bekleniyor</Text>
            </View>
          )}
          {item.status === 'rejected' && item.reject_reason && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 2 }}>
              <Ionicons name="information-circle-outline" size={14} color="#64748B" style={{ marginTop: 2 }} />
              <Text style={{ color: '#64748B', fontSize: 12, fontStyle: 'italic', flex: 1 }}>
                Red sebebi: {item.reject_reason}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────
// Reject Reason Modal (for receiver rejecting)
// ─────────────────────────────────────────────────────────────

function RejectReasonModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean; onClose: () => void; onSubmit: (reason: string) => void; loading: boolean
}) {
  const [reason, setReason] = useState('')

  useEffect(() => { if (visible) setReason('') }, [visible])

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 }}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 24, width: 340, borderWidth: 1, borderColor: '#334155' }}>
              <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Talebi Reddet</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>Red sebebi belirtmek ister misiniz? (opsiyonel)</Text>
              <TextInput
                value={reason} onChangeText={setReason}
                placeholder="Red sebebi yazın..." placeholderTextColor="#475569"
                multiline numberOfLines={3} textAlignVertical="top"
                style={{ backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#F1F5F9', fontSize: 14, minHeight: 80, marginBottom: 16 }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={onClose} disabled={loading}
                  style={{ flex: 1, borderWidth: 1, borderColor: '#334155', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600' }}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onSubmit(reason.trim())} disabled={loading}
                  style={{ flex: 1, backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: loading ? 0.6 : 1 }}>
                  {loading ? <ActivityIndicator size="small" color="#FFF" /> : (
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Reddet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// New Swap Request Modal (3-step wizard)
// ─────────────────────────────────────────────────────────────

function NewSwapRequestModal({ visible, onClose, onSuccess, toast, initialSlotId }: {
  visible: boolean; onClose: () => void; onSuccess: () => void; toast: ReturnType<typeof useToast>; initialSlotId?: string
}) {
  const { user, profile } = useAuth()
  const [step, setStep] = useState(1)

  // Step 1 state
  const [mySlots, setMySlots] = useState<ShiftSlot[]>([])
  const [loadingMySlots, setLoadingMySlots] = useState(false)
  const [selectedMySlot, setSelectedMySlot] = useState<string | null>(null)

  // Step 2 state
  const [colleagues, setColleagues] = useState<StaffMember[]>([])
  const [loadingColleagues, setLoadingColleagues] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<StaffMember | null>(null)
  const [theirSlots, setTheirSlots] = useState<ShiftSlot[]>([])
  const [loadingTheirSlots, setLoadingTheirSlots] = useState(false)
  const [selectedTheirSlot, setSelectedTheirSlot] = useState<string | null>(null)

  // Step 3 state
  const [submitting, setSubmitting] = useState(false)

  // Reset on open
  useEffect(() => {
    if (visible) {
      setStep(1)
      setSelectedMySlot(initialSlotId || null)
      setSelectedPerson(null)
      setTheirSlots([])
      setSelectedTheirSlot(null)
    }
  }, [visible, initialSlotId])

  // Step 1: fetch my future slots
  useEffect(() => {
    if (!visible || !user) return
    async function fetchMySlots() {
      setLoadingMySlots(true)
      try {
        const today = toDateStr(new Date())
        const { data, error } = await supabase
          .from('schedule_slots')
          .select('id, date, start_time, end_time, departments(name)')
          .eq('staff_id', user!.id)
          .eq('status', 'active')
          .gte('date', today)
          .order('date', { ascending: true })
        if (error) throw error
        setMySlots((data as unknown as ShiftSlot[]) ?? [])
      } catch (err) {
        console.error('Nöbetler yüklenemedi:', err)
        setMySlots([])
      } finally { setLoadingMySlots(false) }
    }
    fetchMySlots()
  }, [visible, user])

  // Step 2: fetch colleagues
  useEffect(() => {
    if (step !== 2 || !profile || !user) return
    async function fetchColleagues() {
      setLoadingColleagues(true)
      try {
        console.log('institutionId:', profile?.institutionId)
        console.log('userId:', user?.id)
        console.log('departmentId:', profile?.departmentId)

        // institutionId yoksa sorgu çalıştırma
        if (!profile?.institutionId) {
          console.error('institutionId bulunamadı')
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, department_id')
          .eq('institution_id', profile.institutionId)
          .eq('is_active', true)
          .neq('id', user.id)
          .order('full_name', { ascending: true })

        if (error) console.error('Sorgu hatası:', error)
        console.log('Bulunan kişiler:', data)

        setColleagues((data as StaffMember[]) ?? [])
      } catch (err) {
        console.error('Personel listesi yüklenemedi:', err)
        setColleagues([])
      } finally { setLoadingColleagues(false) }
    }
    fetchColleagues()
  }, [step, profile, user])

  // Fetch selected person's slots
  useEffect(() => {
    if (!selectedPerson) { setTheirSlots([]); return }
    async function fetchTheirSlots() {
      setLoadingTheirSlots(true)
      try {
        const today = toDateStr(new Date())
        const { data, error } = await supabase
          .from('schedule_slots')
          .select('id, date, start_time, end_time, departments(name)')
          .eq('staff_id', selectedPerson!.id)
          .eq('status', 'active')
          .gte('date', today)
          .order('date', { ascending: true })
        if (error) throw error
        setTheirSlots((data as unknown as ShiftSlot[]) ?? [])
      } catch (err) {
        console.error('Karşı taraf nöbetleri yüklenemedi:', err)
        setTheirSlots([])
      } finally { setLoadingTheirSlots(false) }
    }
    fetchTheirSlots()
  }, [selectedPerson])

  // Derived data for step 3
  const mySlotData = mySlots.find((s) => s.id === selectedMySlot)
  const theirSlotData = theirSlots.find((s) => s.id === selectedTheirSlot)

  async function handleSubmit() {
    if (!user || !selectedMySlot || !selectedTheirSlot || !selectedPerson) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('swap_requests').insert({
        requester_id: user.id,
        receiver_id: selectedPerson.id,
        requester_slot_id: selectedMySlot,
        receiver_slot_id: selectedTheirSlot,
        status: 'pending',
      })
      if (error) { Alert.alert('Hata', `Takas talebi oluşturulamadı: ${error.message}`); return }
      onClose(); onSuccess(); toast.show('Takas talebiniz gönderildi')
    } catch (err: unknown) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu')
    } finally { setSubmitting(false) }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
        {/* Header */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#1E293B' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#334155' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {step > 1 && (
                <TouchableOpacity onPress={() => setStep(step - 1)} style={{ padding: 4 }}>
                  <Ionicons name="chevron-back" size={22} color="#94A3B8" />
                </TouchableOpacity>
              )}
              <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700' }}>
                {step === 1 ? 'Nöbet Seçin' : step === 2 ? 'Kişi ve Nöbet Seçin' : 'Takas Özeti'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#334155', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {/* Step indicator */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, gap: 6 }}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: s <= step ? '#3B82F6' : '#334155' }} />
            ))}
          </View>
        </SafeAreaView>

        {/* STEP 1 — Select my slot */}
        {step === 1 && (
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#94A3B8', fontSize: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
              Hangi nöbetinizi vermek istiyorsunuz?
            </Text>
            {loadingMySlots ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : mySlots.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                <Ionicons name="calendar-outline" size={48} color="#334155" />
                <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 12, textAlign: 'center' }}>Gelecek tarihli aktif nöbetiniz bulunmuyor.</Text>
              </View>
            ) : (
              <FlatList
                data={mySlots}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isActive = selectedMySlot === item.id
                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedMySlot(item.id)}
                      style={{
                        backgroundColor: '#1E293B',
                        borderWidth: 1.5,
                        borderColor: isActive ? '#3B82F6' : '#334155',
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View>
                        <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600' }}>
                          {formatDateWithDay(item.date)}
                        </Text>
                        <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 2 }}>
                          {formatTime(item.start_time)}–{formatTime(item.end_time)}
                        </Text>
                        {item.departments?.name && (
                          <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{item.departments.name}</Text>
                        )}
                      </View>
                      {isActive && (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                }}
              />
            )}
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#0F172A' }}>
              <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
                <TouchableOpacity onPress={() => setStep(2)} disabled={!selectedMySlot}
                  style={{ backgroundColor: selectedMySlot ? '#3B82F6' : '#1E3A8A', borderRadius: 16, paddingVertical: 14, alignItems: 'center', opacity: selectedMySlot ? 1 : 0.5, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>İleri</Text>
                  <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        )}

        {/* STEP 2 — Select person & their slot */}
        {step === 2 && (
          <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: '#94A3B8', fontSize: 14, paddingTop: 16, paddingBottom: 12 }}>
                Kiminle takas yapmak istiyorsunuz?
              </Text>

              {loadingColleagues ? (
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 24 }} />
              ) : colleagues.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Ionicons name="people-outline" size={48} color="#334155" />
                  <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 12, textAlign: 'center' }}>Aynı kurumda başka personel bulunamadı.</Text>
                </View>
              ) : (
                <View style={{ gap: 8, marginBottom: 20 }}>
                  {colleagues.map((person) => {
                    const isActive = selectedPerson?.id === person.id
                    return (
                      <TouchableOpacity
                        key={person.id}
                        onPress={() => { setSelectedPerson(person); setSelectedTheirSlot(null) }}
                        style={{
                          backgroundColor: '#1E293B',
                          borderWidth: 1.5,
                          borderColor: isActive ? '#3B82F6' : '#334155',
                          borderRadius: 14,
                          padding: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <View style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: isActive ? '#3B82F6' : '#334155',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ color: isActive ? '#FFFFFF' : '#94A3B8', fontSize: 14, fontWeight: '700' }}>
                            {getInitials(person.full_name)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#F1F5F9', fontSize: 14, fontWeight: '600' }}>
                            {person.full_name}
                          </Text>
                          {person.role === 'department_admin' && (
                            <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>(Departman Yöneticisi)</Text>
                          )}
                          {person.role === 'institution_admin' && (
                            <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>(Kurum Yöneticisi)</Text>
                          )}
                          {person.department_id && profile?.departmentId && person.department_id !== profile.departmentId && (
                            <View style={{ backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' }}>
                              <Text style={{ color: '#60A5FA', fontSize: 10, fontWeight: '500' }}>Farklı departman</Text>
                            </View>
                          )}
                        </View>
                        {isActive && <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              {/* Their slots */}
              {selectedPerson && (
                <>
                  <View style={{ height: 1, backgroundColor: '#334155', marginBottom: 16 }} />
                  <Text style={{ color: '#94A3B8', fontSize: 14, marginBottom: 12 }}>
                    {selectedPerson.full_name} adlı kişinin nöbetleri:
                  </Text>
                  {loadingTheirSlots ? (
                    <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 12 }} />
                  ) : theirSlots.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center' }}>Bu kişinin gelecek tarihli aktif nöbeti bulunmuyor.</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {theirSlots.map((slot) => {
                        const isActive = selectedTheirSlot === slot.id
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            onPress={() => setSelectedTheirSlot(slot.id)}
                            style={{
                              backgroundColor: '#0F172A',
                              borderWidth: 1.5,
                              borderColor: isActive ? '#3B82F6' : '#1E293B',
                              borderRadius: 12,
                              padding: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View>
                              <Text style={{ color: '#F1F5F9', fontSize: 13, fontWeight: '600' }}>
                                {formatDateWithDay(slot.date)}
                              </Text>
                              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                                {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                              </Text>
                            </View>
                            {isActive && (
                              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                              </View>
                            )}
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#0F172A' }}>
              <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
                <TouchableOpacity onPress={() => setStep(3)} disabled={!selectedPerson || !selectedTheirSlot}
                  style={{ backgroundColor: selectedPerson && selectedTheirSlot ? '#3B82F6' : '#1E3A8A', borderRadius: 16, paddingVertical: 14, alignItems: 'center', opacity: selectedPerson && selectedTheirSlot ? 1 : 0.5, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>İleri</Text>
                  <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        )}

        {/* STEP 3 — Confirmation */}
        {step === 3 && (
          <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: '#94A3B8', fontSize: 14, marginBottom: 20 }}>
                Takas talebinizi onaylamadan önce kontrol edin:
              </Text>

              <View style={{
                backgroundColor: '#1E293B',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#334155',
                padding: 20,
              }}>
                {/* My slot */}
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    Benim Nöbetim
                  </Text>
                  {mySlotData && (
                    <>
                      <Text style={{ color: '#F1F5F9', fontSize: 16, fontWeight: '700' }}>
                        {formatDateWithDayFull(mySlotData.date)}
                      </Text>
                      <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 4 }}>
                        {formatTime(mySlotData.start_time)}–{formatTime(mySlotData.end_time)}
                      </Text>
                      {mySlotData.departments?.name && (
                        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{mySlotData.departments.name}</Text>
                      )}
                    </>
                  )}
                </View>

                {/* Swap icon */}
                <View style={{ alignItems: 'center', marginVertical: 8 }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
                  }}>
                    <Ionicons name="swap-vertical" size={24} color="#3B82F6" />
                  </View>
                </View>

                {/* Their slot */}
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    {selectedPerson?.full_name} Nöbeti
                  </Text>
                  {theirSlotData && (
                    <>
                      <Text style={{ color: '#F1F5F9', fontSize: 16, fontWeight: '700' }}>
                        {formatDateWithDayFull(theirSlotData.date)}
                      </Text>
                      <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 4 }}>
                        {formatTime(theirSlotData.start_time)}–{formatTime(theirSlotData.end_time)}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </ScrollView>

            <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#0F172A' }}>
              <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1E293B' }}>
                <TouchableOpacity onPress={handleSubmit} disabled={submitting}
                  style={{ backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? <ActivityIndicator color="#FFFFFF" /> : (
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Talebi Gönder</Text>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        )}
      </View>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Swap Tab Content
// ─────────────────────────────────────────────────────────────

function SwapTabContent({ toast }: { toast: ReturnType<typeof useToast> }) {
  const { user } = useAuth()
  const { sentRequests, receivedRequests, loading, refresh, realtimeToast, clearRealtimeToast } = useSwapRequests()
  const params = useLocalSearchParams<{ mySlotId?: string }>()

  const [swapSubTab, setSwapSubTab] = useState<SwapSubTab>('sent')
  const [swapModalVisible, setSwapModalVisible] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Show realtime toast
  useEffect(() => {
    if (realtimeToast) {
      toast.show(realtimeToast)
      clearRealtimeToast()
    }
  }, [realtimeToast, toast, clearRealtimeToast])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  // Cancel swap (requester)
  async function handleCancelSwap(id: string) {
    if (!user) return
    setActionLoadingId(id)
    try {
      const { error } = await supabase.from('swap_requests').delete().eq('id', id).eq('requester_id', user.id)
      if (error) { Alert.alert('Hata', `İptal işlemi başarısız: ${error.message}`); return }
      await refresh()
      toast.show('Takas talebi iptal edildi')
    } catch (err: unknown) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu')
    } finally { setActionLoadingId(null) }
  }

  // Accept swap (receiver)
  async function handleAcceptSwap(id: string) {
    setActionLoadingId(id)
    try {
      const { error } = await supabase.from('swap_requests').update({ status: 'approved_by_receiver' }).eq('id', id)
      if (error) { Alert.alert('Hata', `Kabul işlemi başarısız: ${error.message}`); return }
      await refresh()
      toast.show('Takas talebi kabul edildi')
    } catch (err: unknown) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu')
    } finally { setActionLoadingId(null) }
  }

  // Reject swap (receiver) — opens modal
  function handleRejectSwap(id: string) {
    setRejectTargetId(id)
    setRejectModalVisible(true)
  }

  async function submitReject(reason: string) {
    if (!rejectTargetId) return
    setActionLoadingId(rejectTargetId)
    try {
      const { error } = await supabase.from('swap_requests')
        .update({ status: 'rejected', reject_reason: reason || null })
        .eq('id', rejectTargetId)
      if (error) { Alert.alert('Hata', `Red işlemi başarısız: ${error.message}`); return }
      setRejectModalVisible(false)
      await refresh()
      toast.show('Takas talebi reddedildi')
    } catch (err: unknown) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu')
    } finally { setActionLoadingId(null); setRejectTargetId(null) }
  }

  const currentList = swapSubTab === 'sent' ? sentRequests : receivedRequests

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />
        }
        ListHeaderComponent={
          <View>
            {/* New Swap Request Button */}
            <TouchableOpacity
              onPress={() => setSwapModalVisible(true)}
              style={{
                backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 14,
                alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 16,
              }}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Yeni Takas Talebi</Text>
            </TouchableOpacity>

            {/* Sub-tabs */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setSwapSubTab('sent')}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: swapSubTab === 'sent' ? '#3B82F6' : '#334155',
                  backgroundColor: swapSubTab === 'sent' ? 'rgba(59,130,246,0.1)' : 'transparent',
                }}
              >
                <Text style={{
                  color: swapSubTab === 'sent' ? '#3B82F6' : '#64748B',
                  fontSize: 13, fontWeight: swapSubTab === 'sent' ? '700' : '500',
                }}>Gönderdiklerim ({sentRequests.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSwapSubTab('received')}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: swapSubTab === 'received' ? '#3B82F6' : '#334155',
                  backgroundColor: swapSubTab === 'received' ? 'rgba(59,130,246,0.1)' : 'transparent',
                }}
              >
                <Text style={{
                  color: swapSubTab === 'received' ? '#3B82F6' : '#64748B',
                  fontSize: 13, fontWeight: swapSubTab === 'received' ? '700' : '500',
                }}>Gelenler ({receivedRequests.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SwapRequestCard
            item={item}
            isSentTab={swapSubTab === 'sent'}
            userId={user?.id ?? ''}
            onCancelSwap={handleCancelSwap}
            onAcceptSwap={handleAcceptSwap}
            onRejectSwap={handleRejectSwap}
            actionLoadingId={actionLoadingId}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
            <Text style={{ fontSize: 48 }}>{swapSubTab === 'sent' ? '🔄' : '📭'}</Text>
            <Text style={{ color: '#94A3B8', fontSize: 15, fontWeight: '600' }}>
              {swapSubTab === 'sent' ? 'Henüz takas talebi göndermediniz' : 'Gelen takas talebiniz yok'}
            </Text>
            <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center' }}>
              {swapSubTab === 'sent'
                ? 'Yukarıdaki butona tıklayarak yeni bir takas talebi oluşturabilirsiniz.'
                : 'Başka personeller size takas talebi gönderdiğinde burada görünecek.'}
            </Text>
          </View>
        }
      />

      {/* New Swap Modal */}
      <NewSwapRequestModal
        visible={swapModalVisible}
        onClose={() => setSwapModalVisible(false)}
        onSuccess={refresh}
        toast={toast}
        initialSlotId={params.mySlotId}
      />

      {/* Reject Reason Modal */}
      <RejectReasonModal
        visible={rejectModalVisible}
        onClose={() => { setRejectModalVisible(false); setRejectTargetId(null) }}
        onSubmit={submitReject}
        loading={actionLoadingId === rejectTargetId}
      />
    </View>
  )
}

// ═════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════

export default function RequestsScreen() {
  const { user } = useAuth()
  const params = useLocalSearchParams<{ tab?: string }>()

  const [selectedTab, setSelectedTab] = useState<TabKey>('leave')
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelRequestingId, setCancelRequestingId] = useState<string | null>(null)
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
      if (error) { console.error('İzin talepleri yüklenemedi:', error.message); return }
      setLeaveRequests((data as LeaveRequest[]) ?? [])
    } catch (err) { console.error('İzin talepleri yüklenemedi:', err) }
  }, [user])

  useEffect(() => {
    async function init() { setLoading(true); await loadLeaveRequests(); setLoading(false) }
    init()
  }, [loadLeaveRequests])

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await loadLeaveRequests(); setRefreshing(false)
  }, [loadLeaveRequests])

  async function handleCancel(id: string) {
    setCancellingId(id)
    try {
      const { error } = await supabase.from('leave_requests').update({ status: 'cancelled' as LeaveStatus })
        .eq('id', id).eq('staff_id', user!.id).eq('status', 'pending')
      if (error) { Alert.alert('Hata', `İptal işlemi başarısız: ${error.message}`); return }
      await loadLeaveRequests(); toast.show('Talep iptal edildi')
    } catch (err: unknown) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu')
    } finally { setCancellingId(null) }
  }

  async function handleCancelRequest(id: string, reason: string) {
    setCancelRequestingId(id)
    try {
      const { error } = await supabase.from('leave_requests')
        .update({ cancel_requested: true, cancel_reason: reason || null })
        .eq('id', id).eq('staff_id', user!.id)
      if (error) { Alert.alert('Hata', `Talep gönderilemedi: ${error.message}`); return }
      await loadLeaveRequests(); toast.show('İptal talebiniz iletildi')
    } catch (err: unknown) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu')
    } finally { setCancelRequestingId(null) }
  }

  const pendingCount = leaveRequests.filter((r) => r.status === 'pending').length
  const approvedCount = leaveRequests.filter((r) => r.status === 'approved').length
  const rejectedCount = leaveRequests.filter((r) => r.status === 'rejected' || r.status === 'cancelled').length

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }} edges={['top']}>
      <Toast visible={toast.visible} message={toast.message} translateY={toast.translateY} opacity={toast.opacity} />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: '#F8FAFC', fontSize: 24, fontWeight: '800' }}>Talepler</Text>
        <Text style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>İzin ve takas taleplerinizi yönetin</Text>
      </View>

      {/* Tab Bar */}
      <View style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: '#1E293B', borderRadius: 14, padding: 4 }}>
        <TouchableOpacity onPress={() => setSelectedTab('leave')}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: selectedTab === 'leave' ? '#0F172A' : 'transparent' }}>
          <Text style={{ color: selectedTab === 'leave' ? '#3B82F6' : '#64748B', fontSize: 14, fontWeight: selectedTab === 'leave' ? '700' : '500' }}>İzin Talepleri</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedTab('swap')}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: selectedTab === 'swap' ? '#0F172A' : 'transparent' }}>
          <Text style={{ color: selectedTab === 'swap' ? '#3B82F6' : '#64748B', fontSize: 14, fontWeight: selectedTab === 'swap' ? '700' : '500' }}>Takas Talepleri</Text>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />}
            ListHeaderComponent={
              <View>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <SummaryBox count={pendingCount} label="Bekleyen" color="#FBBF24" bgColor="rgba(251,191,36,0.1)" />
                  <SummaryBox count={approvedCount} label="Onaylanan" color="#34D399" bgColor="rgba(52,211,153,0.1)" />
                  <SummaryBox count={rejectedCount} label="Reddedilen" color="#F87171" bgColor="rgba(248,113,113,0.1)" />
                </View>
                <TouchableOpacity onPress={() => setModalVisible(true)}
                  style={{ backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Yeni İzin Talebi</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => <LeaveRequestCard item={item} onCancel={handleCancel} cancellingId={cancellingId} onCancelRequest={handleCancelRequest} cancelRequestingId={cancelRequestingId} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
                <Text style={{ fontSize: 48 }}>🏖️</Text>
                <Text style={{ color: '#94A3B8', fontSize: 15, fontWeight: '600' }}>Henüz izin talebiniz yok</Text>
                <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center' }}>Yukarıdaki butona tıklayarak yeni bir izin talebi oluşturabilirsiniz.</Text>
              </View>
            }
          />
        )
      ) : (
        <SwapTabContent toast={toast} />
      )}

      <NewLeaveRequestModal visible={modalVisible} onClose={() => setModalVisible(false)} onSuccess={loadLeaveRequests} toast={toast} />
    </SafeAreaView>
  )
}
