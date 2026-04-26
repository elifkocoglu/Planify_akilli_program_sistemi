import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { doTimesOverlap } from '../../utils'

/**
 * Öğretmenin aynı anda iki yerde olamayacağını kontrol eder.
 * value: {} (boş, tip yeterli)
 */
export function validateTeacherNoOverlap(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const conflict = slots.some(
    (s) =>
      s.staffId === candidateSlot.staffId &&
      s.status === 'active' &&
      s.date === candidateSlot.date &&
      s.id !== candidateSlot.id &&
      doTimesOverlap(s.startTime, s.endTime, candidateSlot.startTime, candidateSlot.endTime)
  )

  return {
    isValid: !conflict,
    constraintId: constraint.id,
    constraintType: 'teacher_no_overlap',
    staffId: candidateSlot.staffId,
    message: conflict ? 'Öğretmen aynı anda iki yerde olamaz' : '',
  }
}
