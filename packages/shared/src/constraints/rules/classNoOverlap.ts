import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { doTimesOverlap } from '../../utils'

/**
 * Aynı derslikte aynı anda iki ders olamayacağını kontrol eder.
 * value: {} (boş, tip yeterli)
 */
export function validateClassNoOverlap(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  if (!candidateSlot.roomId) {
    return {
      isValid: true,
      constraintId: constraint.id,
      constraintType: 'class_no_overlap',
      message: '',
    }
  }

  const conflict = slots.some(
    (s) =>
      s.roomId === candidateSlot.roomId &&
      s.status === 'active' &&
      s.date === candidateSlot.date &&
      s.id !== candidateSlot.id &&
      doTimesOverlap(s.startTime, s.endTime, candidateSlot.startTime, candidateSlot.endTime)
  )

  return {
    isValid: !conflict,
    constraintId: constraint.id,
    constraintType: 'class_no_overlap',
    message: conflict ? 'Bu derslikte aynı anda iki ders olamaz' : '',
  }
}
