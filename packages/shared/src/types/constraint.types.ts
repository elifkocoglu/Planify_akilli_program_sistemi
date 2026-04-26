/** Veritabanındaki constraint_type enum'ına karşılık gelen tip */
export type ConstraintType =
  | 'max_shifts_per_week'
  | 'max_shifts_per_month'
  | 'max_hours_per_week'
  | 'min_rest_hours'
  | 'no_consecutive_days'
  | 'unavailable_day'
  | 'unavailable_date'
  | 'unavailable_time'
  | 'required_title_per_shift'
  | 'min_staff_per_shift'
  | 'max_staff_per_shift'
  | 'not_together_shift'
  | 'must_together_shift'
  | 'teacher_no_overlap'
  | 'class_no_overlap'
  | 'custom'

/** Kısıt tanımı */
export interface Constraint {
  id: string
  institutionId: string
  departmentId?: string
  /** null ise tüm kurum için geçerli */
  staffId?: string
  type: ConstraintType
  value: Record<string, unknown>
  isActive: boolean
}

/** Tek bir kısıt doğrulama sonucu */
export interface ValidationResult {
  isValid: boolean
  constraintId: string
  constraintType: ConstraintType
  staffId?: string
  /** Türkçe hata mesajı */
  message: string
}

/** Kural fonksiyonu imzası */
export type RuleFunction = (
  slots: import('./schedule.types').ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: import('./schedule.types').ScheduleSlot
) => ValidationResult
