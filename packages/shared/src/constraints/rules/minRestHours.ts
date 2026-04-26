import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { getMinutesBetween } from '../../utils'

/**
 * Nöbetler arası minimum dinlenme süresini kontrol eder.
 * value: { hours: number }
 */
export function validateMinRestHours(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const minHours = (constraint.value as { hours: number }).hours ?? 0

  const staffSlots = slots
    .filter(
      (s) => s.staffId === candidateSlot.staffId && s.status === 'active'
    )
    .sort((a, b) => {
      const dateComp = a.date.localeCompare(b.date)
      return dateComp !== 0 ? dateComp : a.startTime.localeCompare(b.startTime)
    })

  for (const slot of staffSlots) {
    // Mevcut slot bitiş → aday slot başlangıç
    const gap1 = getMinutesBetween(
      slot.date,
      slot.endTime,
      candidateSlot.date,
      candidateSlot.startTime
    )
    // Aday slot bitiş → mevcut slot başlangıç
    const gap2 = getMinutesBetween(
      candidateSlot.date,
      candidateSlot.endTime,
      slot.date,
      slot.startTime
    )

    // Sadece pozitif (gelecek) gap'leri kontrol et; sıfır ise çakışma var demektir
    if (
      (gap1 >= 0 && gap1 < minHours * 60) ||
      (gap2 >= 0 && gap2 < minHours * 60)
    ) {
      return {
        isValid: false,
        constraintId: constraint.id,
        constraintType: 'min_rest_hours',
        staffId: candidateSlot.staffId,
        message: `Nöbetler arası en az ${minHours} saat dinlenme gerekiyor`,
      }
    }
  }

  return {
    isValid: true,
    constraintId: constraint.id,
    constraintType: 'min_rest_hours',
    staffId: candidateSlot.staffId,
    message: '',
  }
}
