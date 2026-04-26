import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { doTimesOverlap } from '../../utils'

/**
 * Personelin müsait olmadığı saat aralığı kontrolü.
 * value: { start: string, end: string }
 */
export function validateUnavailableTime(
  _slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const { start, end } = constraint.value as { start: string; end: string }

  if (!start || !end) {
    return {
      isValid: true,
      constraintId: constraint.id,
      constraintType: 'unavailable_time',
      staffId: candidateSlot.staffId,
      message: '',
    }
  }

  const overlaps = doTimesOverlap(
    candidateSlot.startTime,
    candidateSlot.endTime,
    start,
    end
  )

  return {
    isValid: !overlaps,
    constraintId: constraint.id,
    constraintType: 'unavailable_time',
    staffId: candidateSlot.staffId,
    message: overlaps
      ? 'Bu personel bu saat aralığında müsait değil'
      : '',
  }
}
