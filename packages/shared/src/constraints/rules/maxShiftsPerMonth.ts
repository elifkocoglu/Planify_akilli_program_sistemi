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
  const max = (constraint.value as any).max as number
  
  // Aynı ay + aynı staff + active status
  const candidateMonth = candidateSlot.date.substring(0, 7) // "2025-01"
  
  const monthlySlots = slots.filter(slot =>
    slot.staffId === candidateSlot.staffId &&
    slot.date.substring(0, 7) === candidateMonth &&
    slot.status === 'active'
  )
  
  if (monthlySlots.length >= max) {
    return {
      isValid: false,
      constraintId: constraint.id,
      constraintType: constraint.type,
      staffId: candidateSlot.staffId,
      message: `Bu personel bu ay maksimum ${max} nöbet limitine ulaştı`
    }
  }
  
  return {
    isValid: true,
    constraintId: constraint.id,
    constraintType: constraint.type,
    staffId: candidateSlot.staffId,
    message: ''
  }
}
