import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { getWeekNumber } from '../../utils'

/**
 * Haftalık maksimum nöbet/ders sayısını kontrol eder.
 * value: { max: number }
 */
export function validateMaxShiftsPerWeek(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const max = (constraint.value as { max: number }).max ?? Infinity
  const candidateWeek = getWeekNumber(candidateSlot.date)
  const candidateYear = candidateSlot.date.slice(0, 4)

  const count = slots.filter(
    (s) =>
      s.staffId === candidateSlot.staffId &&
      s.status === 'active' &&
      s.date.slice(0, 4) === candidateYear &&
      getWeekNumber(s.date) === candidateWeek
  ).length

  return {
    isValid: count < max,
    constraintId: constraint.id,
    constraintType: 'max_shifts_per_week',
    staffId: candidateSlot.staffId,
    message:
      count >= max
        ? `Bu personel bu hafta maksimum ${max} nöbet limitine ulaştı`
        : '',
  }
}
