import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'

/**
 * Aylık maksimum nöbet/ders sayısını kontrol eder.
 * value: { max: number }
 */
export function validateMaxShiftsPerMonth(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const max = (constraint.value as { max: number }).max ?? Infinity
  const candidateMonth = candidateSlot.date.slice(0, 7) // "YYYY-MM"

  const count = slots.filter(
    (s) =>
      s.staffId === candidateSlot.staffId &&
      s.status === 'active' &&
      s.date.slice(0, 7) === candidateMonth
  ).length

  return {
    isValid: count < max,
    constraintId: constraint.id,
    constraintType: 'max_shifts_per_month',
    staffId: candidateSlot.staffId,
    message:
      count >= max
        ? `Bu personel bu ay maksimum ${max} nöbet limitine ulaştı`
        : '',
  }
}
