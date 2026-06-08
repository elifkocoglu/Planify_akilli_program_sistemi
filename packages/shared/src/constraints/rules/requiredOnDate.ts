import type { ValidationResult, Constraint } from '../../types/constraint.types'
import type { ScheduleSlot } from '../../types/schedule.types'

export function validateRequiredOnDate(
  _slots: ScheduleSlot[],
  constraint: Constraint,
  _candidateSlot: ScheduleSlot
): ValidationResult {
  // Bu kısıt generator'da özel handle edilecek (öncelikli seçim)
  // Validator'da her zaman geçerli döndür.
  return {
    isValid: true,
    constraintId: constraint.id,
    constraintType: constraint.type,
    message: ''
  }
}
