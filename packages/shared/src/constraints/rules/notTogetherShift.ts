import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { doTimesOverlap } from '../../utils'

/**
 * Birlikte olamayacak personelleri kontrol eder.
 * value: { staffIds: string[] }
 */
export function validateNotTogetherShift(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const staffIds =
    (constraint.value as { staffIds: string[] }).staffIds ?? []

  if (!staffIds.includes(candidateSlot.staffId)) {
    return {
      isValid: true,
      constraintId: constraint.id,
      constraintType: 'not_together_shift',
      staffId: candidateSlot.staffId,
      message: '',
    }
  }

  const otherForbidden = staffIds.filter(
    (id) => id !== candidateSlot.staffId
  )

  const conflict = slots.some(
    (s) =>
      s.status === 'active' &&
      otherForbidden.includes(s.staffId) &&
      s.date === candidateSlot.date &&
      doTimesOverlap(s.startTime, s.endTime, candidateSlot.startTime, candidateSlot.endTime)
  )

  return {
    isValid: !conflict,
    constraintId: constraint.id,
    constraintType: 'not_together_shift',
    staffId: candidateSlot.staffId,
    message: conflict
      ? 'Bu personeller aynı vardiyada birlikte olamaz'
      : '',
  }
}
