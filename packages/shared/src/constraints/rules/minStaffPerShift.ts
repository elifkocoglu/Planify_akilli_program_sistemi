import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { doTimesOverlap } from '../../utils'

/**
 * Vardiyada minimum personel sayısını kontrol eder.
 * value: { min: number }
 * NOT: Bu kural bilgilendirme amaçlıdır — yeni slot eklenirken
 * red yerine uyarı olarak kullanılır.
 */
export function validateMinStaffPerShift(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const min = (constraint.value as { min: number }).min ?? 1

  const sameShiftCount =
    slots.filter(
      (s) =>
        s.status === 'active' &&
        s.date === candidateSlot.date &&
        doTimesOverlap(s.startTime, s.endTime, candidateSlot.startTime, candidateSlot.endTime)
    ).length + 1 // +1 aday slot

  return {
    isValid: sameShiftCount >= min,
    constraintId: constraint.id,
    constraintType: 'min_staff_per_shift',
    message:
      sameShiftCount < min
        ? `Bu vardiyada minimum ${min} personel olmalı`
        : '',
  }
}
