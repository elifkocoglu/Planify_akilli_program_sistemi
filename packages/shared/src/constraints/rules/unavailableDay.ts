import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'

/**
 * Personelin müsait olmadığı gün kontrolü.
 * value: { dayOfWeek: number[] }
 */
export function validateUnavailableDay(
  _slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const days = (constraint.value as { dayOfWeek: number[] }).dayOfWeek ?? []

  return {
    isValid: !days.includes(candidateSlot.dayOfWeek),
    constraintId: constraint.id,
    constraintType: 'unavailable_day',
    staffId: candidateSlot.staffId,
    message: days.includes(candidateSlot.dayOfWeek)
      ? 'Bu personel bu gün müsait değil'
      : '',
  }
}
