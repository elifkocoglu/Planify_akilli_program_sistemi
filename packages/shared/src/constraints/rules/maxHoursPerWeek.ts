import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { getWeekNumber, getShiftDurationMinutes } from '../../utils'

/**
 * Haftalık maksimum çalışma saatini kontrol eder.
 * value: { hours: number }
 */
export function validateMaxHoursPerWeek(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const maxHours = (constraint.value as { hours: number }).hours ?? Infinity
  const candidateWeek = getWeekNumber(candidateSlot.date)
  const candidateYear = candidateSlot.date.slice(0, 4)

  const totalMinutes = slots
    .filter(
      (s) =>
        s.staffId === candidateSlot.staffId &&
        s.status === 'active' &&
        s.date.slice(0, 4) === candidateYear &&
        getWeekNumber(s.date) === candidateWeek
    )
    .reduce((sum, s) => sum + getShiftDurationMinutes(s.startTime, s.endTime), 0)

  const candidateMinutes = getShiftDurationMinutes(
    candidateSlot.startTime,
    candidateSlot.endTime
  )
  const totalHours = (totalMinutes + candidateMinutes) / 60

  return {
    isValid: totalHours <= maxHours,
    constraintId: constraint.id,
    constraintType: 'max_hours_per_week',
    staffId: candidateSlot.staffId,
    message:
      totalHours > maxHours
        ? `Bu personel haftalık ${maxHours} saat limitini aşıyor`
        : '',
  }
}
