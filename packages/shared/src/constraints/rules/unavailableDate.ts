import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'

/**
 * Personelin müsait olmadığı tarih kontrolü.
 * value: { dates: string[] }
 */
export function validateUnavailableDate(
  _slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const dates = (constraint.value as { dates: string[] }).dates ?? []

  return {
    isValid: !dates.includes(candidateSlot.date),
    constraintId: constraint.id,
    constraintType: 'unavailable_date',
    staffId: candidateSlot.staffId,
    message: dates.includes(candidateSlot.date)
      ? 'Bu personel bu tarihte izinli'
      : '',
  }
}
