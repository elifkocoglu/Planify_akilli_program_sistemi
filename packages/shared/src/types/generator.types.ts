import type { ScheduleSlot, StaffMember } from './schedule.types'
import type { Constraint } from './constraint.types'

/** Otomatik program üretici girişi */
export interface GeneratorInput {
  staff: StaffMember[]
  constraints: Constraint[]
  /** Varsa mevcut atanmış slotlar */
  existingSlots: ScheduleSlot[]
  dateRange: {
    /** "YYYY-MM-DD" */
    start: string
    /** "YYYY-MM-DD" */
    end: string
  }
  /** Günde kaç nöbet/ders slotu */
  dailySlotCount: number
  /** Dakika cinsinden slot süresi (örn: 480 = 8 saat) */
  slotDuration: number
  /** "HH:MM" formatında günün başlangıç saati */
  startHour: string
  scheduleId: string
  departmentId: string
  scheduleType: 'duty' | 'lesson'
}

/** Otomatik program üretici çıktısı */
export interface GeneratorResult {
  slots: ScheduleSlot[]
  unresolved: UnresolvedSlot[]
  warnings: string[]
}

/** Atanamayan slot bilgisi */
export interface UnresolvedSlot {
  date: string
  reason: string
  attemptedStaffIds: string[]
}
