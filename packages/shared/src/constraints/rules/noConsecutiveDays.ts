import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'

/**
 * Art arda gün sınırını kontrol eder.
 * value: { days: number }
 */
export function validateNoConsecutiveDays(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const maxDays = (constraint.value as { days: number }).days ?? Infinity

  const staffDates = new Set(
    slots
      .filter(
        (s) => s.staffId === candidateSlot.staffId && s.status === 'active'
      )
      .map((s) => s.date)
  )
  staffDates.add(candidateSlot.date)

  // En uzun ardışık gün dizisini bul
  const sortedDates = Array.from(staffDates).sort()
  let maxConsecutive = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + 'T00:00:00')
    const curr = new Date(sortedDates[i] + 'T00:00:00')
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000

    if (diffDays === 1) {
      currentStreak++
      maxConsecutive = Math.max(maxConsecutive, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return {
    isValid: maxConsecutive <= maxDays,
    constraintId: constraint.id,
    constraintType: 'no_consecutive_days',
    staffId: candidateSlot.staffId,
    message:
      maxConsecutive > maxDays
        ? `Bu personel art arda ${maxDays} günden fazla nöbet tutamaz`
        : '',
  }
}
