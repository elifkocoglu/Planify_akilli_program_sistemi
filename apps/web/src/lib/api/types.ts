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

// ─── Staff Tipleri ──────────────────────────────────────────

/** Veritabanındaki profil kaydı (personel listesi) */
export interface StaffRecord {
  id: string
  full_name: string
  role: 'super_admin' | 'institution_admin' | 'department_admin' | 'staff'
  institution_id: string | null
  department_id: string | null
  title_id: string | null
  weekly_max_hours: number | null
  monthly_max_shifts: number | null
  is_active: boolean
  created_at: string
  departments?: { name: string } | null
  titles?: { name: string } | null
  slot_count?: number
}

/** Staff filtre parametreleri */
export interface StaffFilters {
  departmentId?: string
  role?: string
  isActive?: string
  search?: string
}

/** Staff güncelleme isteği */
export interface UpdateStaffInput {
  full_name?: string
  department_id?: string | null
  title_id?: string | null
  role?: string
  weekly_max_hours?: number | null
  monthly_max_shifts?: number | null
  is_active?: boolean
}

/** Staff liste response'u */
export interface StaffListResponse extends BaseResponse {
  staff?: StaffRecord[]
}

/** Staff detay response'u */
export interface StaffDetailResponse extends BaseResponse {
  staff?: StaffRecord
  slotStats?: {
    thisWeek: number
    thisMonth: number
    thisMonthHours: number
    monthlyHistory: Array<{ month: string; count: number }>
  }
  constraints?: ConstraintRecord[]
  upcomingSlots?: SlotRecord[]
  leaveRequests?: Array<{
    id: string
    type: string
    start_date: string
    end_date: string
    reason: string | null
    status: string
    created_at: string
  }>
  swapRequests?: Array<{
    id: string
    requester_id: string
    receiver_id: string
    status: string
    created_at: string
    requester?: { full_name: string }
    receiver?: { full_name: string }
  }>
}

/** Staff response'u */
export interface StaffResponse extends BaseResponse {
  staff?: StaffRecord
}

// ─── Constraint Tipleri ─────────────────────────────────────

/** Veritabanındaki constraint kaydı */
export interface ConstraintRecord {
  id: string
  institution_id: string
  department_id: string | null
  staff_id: string | null
  type: string
  value: Record<string, unknown>
  is_active: boolean
  created_at: string
  profiles?: { full_name: string } | null
  departments?: { name: string } | null
}

/** Constraint filtre parametreleri */
export interface ConstraintFilters {
  type?: string
  staffId?: string
  departmentId?: string
  isActive?: string
}

/** Yeni constraint oluşturma isteği */
export interface CreateConstraintInput {
  type: string
  value: Record<string, unknown>
  departmentId?: string | null
  staffId?: string | null
}

/** Constraint liste response'u */
export interface ConstraintListResponse extends BaseResponse {
  constraints?: ConstraintRecord[]
}

/** Constraint response'u */
export interface ConstraintResponse extends BaseResponse {
  constraint?: ConstraintRecord
}

// ─── Department Tipleri ─────────────────────────────────────

/** Veritabanındaki department kaydı */
export interface DepartmentRecord {
  id: string
  institution_id: string
  name: string
  type: 'duty' | 'lesson'
  created_at: string
  staff_count?: number
}

/** Yeni departman oluşturma isteği */
export interface CreateDepartmentInput {
  name: string
  type: 'duty' | 'lesson'
}

/** Department liste response'u */
export interface DepartmentListResponse extends BaseResponse {
  departments?: DepartmentRecord[]
}

/** Department response'u */
export interface DepartmentResponse extends BaseResponse {
  department?: DepartmentRecord
}

// ─── Title Tipleri ──────────────────────────────────────────

/** Veritabanındaki title kaydı */
export interface TitleRecord {
  id: string
  institution_id: string
  name: string
  min_required_per_shift: number
  created_at: string
  staff_count?: number
}

/** Yeni unvan oluşturma isteği */
export interface CreateTitleInput {
  name: string
  minRequiredPerShift?: number
}

/** Title liste response'u */
export interface TitleListResponse extends BaseResponse {
  titles?: TitleRecord[]
}

/** Title response'u */
export interface TitleResponse extends BaseResponse {
  title?: TitleRecord
}

// ─── Invitation Tipleri ─────────────────────────────────────

/** Davet kodu oluşturma isteği */
export interface CreateInvitationCodeInput {
  role: string
  departmentId: string
  maxUses: number
  expiresInDays: number
}

/** Davet kodu response'u */
export interface InvitationCodeResponse extends BaseResponse {
  code?: string
  expiresAt?: string
}
