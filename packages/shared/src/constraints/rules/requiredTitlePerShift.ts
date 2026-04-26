import type { ScheduleSlot } from '../../types/schedule.types'
import type { Constraint, ValidationResult } from '../../types/constraint.types'
import { doTimesOverlap } from '../../utils'

/**
 * Vardiyada gerekli unvan sayısını kontrol eder.
 * value: { titleId: string, min: number }
 */
export function validateRequiredTitlePerShift(
  slots: ScheduleSlot[],
  constraint: Constraint,
  candidateSlot: ScheduleSlot
): ValidationResult {
  const { titleId, min } = constraint.value as {
    titleId: string
    min: number
  }

  if (!titleId || !min) {
    return {
      isValid: true,
      constraintId: constraint.id,
      constraintType: 'required_title_per_shift',
      message: '',
    }
  }

  // Aynı tarih+saat aralığındaki slotlarda ilgili unvana sahip kişi sayısı
  const sameShiftWithTitle = slots.filter(
    (s) =>
      s.status === 'active' &&
      s.date === candidateSlot.date &&
      doTimesOverlap(s.startTime, s.endTime, candidateSlot.startTime, candidateSlot.endTime) &&
      s.titleId === titleId
  ).length

  // Aday slotun kendisi de o unvana sahipse ekle
  const total =
    sameShiftWithTitle + (candidateSlot.titleId === titleId ? 1 : 0)

  return {
    isValid: total >= min,
    constraintId: constraint.id,
    constraintType: 'required_title_per_shift',
    message:
      total < min
        ? `Bu vardiyada en az ${min} adet gerekli unvan eksik`
        : '',
  }
}
