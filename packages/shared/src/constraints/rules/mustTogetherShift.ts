import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { doTimesOverlap } from '../../utils'

/**
 * Birlikte olması gereken personelleri kontrol eder.
 * value: { staffIds: string[] }
 */
export function validateMustTogetherShift(
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
      constraintType: 'must_together_shift',
      staffId: candidateSlot.staffId,
      message: '',
    }
  }

  const otherRequired = staffIds.filter(
    (id) => id !== candidateSlot.staffId
  )

  // Diğer gerekli personellerin hepsi aynı vardiyada olmalı
  const allPresent = otherRequired.every((requiredId) =>
    slots.some(
      (s) =>
        s.status === 'active' &&
        s.staffId === requiredId &&
        s.date === candidateSlot.date &&
        doTimesOverlap(s.startTime, s.endTime, candidateSlot.startTime, candidateSlot.endTime)
    )
  )

  return {
    isValid: allPresent,
    constraintId: constraint.id,
    constraintType: 'must_together_shift',
    staffId: candidateSlot.staffId,
    message: !allPresent
      ? 'Bu personeller aynı vardiyada birlikte olmalı'
      : '',
  }
}
