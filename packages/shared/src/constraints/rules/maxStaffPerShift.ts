import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { doTimesOverlap } from '../../utils'

/**
 * Vardiyada maksimum personel sayısını kontrol eder.
 * value: { max: number }
 */
export function validateMaxStaffPerShift(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const max = (constraint.value as { max: number }).max ?? Infinity

  const sameShiftCount =
    slots.filter(
      (s) =>
        s.status === 'active' &&
        s.date === candidateSlot.date &&
        doTimesOverlap(s.startTime, s.endTime, candidateSlot.startTime, candidateSlot.endTime)
    ).length + 1 // +1 aday slot

  return {
    isValid: sameShiftCount <= max,
    constraintId: constraint.id,
    constraintType: 'max_staff_per_shift',
    message:
      sameShiftCount > max
        ? `Bu vardiyada maksimum ${max} personel olabilir`
        : '',
  }
}
