import type { UnresolvedSlot, ValidationResult } from '@planify/shared'

// ─── Schedule CRUD Tipleri ───────────────────────────────────

/** Yeni schedule oluşturma isteği */
export interface CreateScheduleInput {
  title: string
  type: 'duty' | 'lesson'
  periodType: 'weekly' | 'monthly'
  departmentId: string
  startDate: string
  endDate: string
}

/** Schedule filtre parametreleri (GET /api/schedules) */
export interface ScheduleFilters {
  departmentId?: string
  status?: 'draft' | 'published' | 'archived'
}

/** Veritabanındaki schedule kaydı */
export interface ScheduleRecord {
  id: string
  institution_id: string
  department_id: string
  title: string
  type: 'duty' | 'lesson'
  period_type: 'weekly' | 'monthly'
  start_date: string
  end_date: string
  status: 'draft' | 'published' | 'archived'
  created_by: string | null
  created_at: string
  departments?: { name: string }
}

/** Veritabanındaki schedule_slot kaydı */
export interface SlotRecord {
  id: string
  schedule_id: string
  staff_id: string
  department_id: string | null
  room_id: string | null
  title_id: string | null
  date: string
  day_of_week: number
  start_time: string
  end_time: string
  status: 'active' | 'swapped' | 'cancelled'
  notes: string | null
  created_at: string
  profiles?: { full_name: string }
}

// ─── Generate Tipleri ────────────────────────────────────────

/** Program üretme isteği */
export interface GenerateScheduleInput {
  scheduleId: string
  dailySlotCount: number
  slotDuration: number
  startHour: string
}

// ─── Slot Yönetimi Tipleri ───────────────────────────────────

/** Manuel slot ekleme isteği */
export interface SlotInput {
  staffId: string
  date: string
  startTime: string
  endTime: string
  roomId?: string
  titleId?: string
}

// ─── API Response Tipleri ────────────────────────────────────

/** Temel başarı/hata response */
export interface BaseResponse {
  success: boolean
  error?: string
}

/** Schedule oluşturma response'u */
export interface ScheduleResponse extends BaseResponse {
  schedule?: ScheduleRecord
}

/** Schedule listesi response'u */
export interface ScheduleListResponse extends BaseResponse {
  schedules?: ScheduleRecord[]
}

/** Schedule detay response'u (slotlar dahil) */
export interface ScheduleDetailResponse extends BaseResponse {
  schedule?: ScheduleRecord
  slots?: SlotRecord[]
}

/** Program üretme response'u */
export interface GenerateResponse extends BaseResponse {
  generatedCount?: number
  unresolved?: UnresolvedSlot[]
  warnings?: string[]
}

/** Slot ekleme/güncelleme response'u */
export interface SlotResponse extends BaseResponse {
  slot?: SlotRecord
  violations?: ValidationResult[]
}

/** Publish response'u */
export interface PublishResponse extends BaseResponse {
  notifiedCount?: number
}
