import type { ScheduleSlot } from '../types/schedule.types'
import type {
  Constraint,
  ConstraintType,
  RuleFunction,
  ValidationResult,
} from '../types/constraint.types'

import { validateMaxShiftsPerWeek } from './rules/maxShiftsPerWeek'
import { validateMaxShiftsPerMonth } from './rules/maxShiftsPerMonth'
import { validateMaxHoursPerWeek } from './rules/maxHoursPerWeek'
import { validateMinRestHours } from './rules/minRestHours'
import { validateNoConsecutiveDays } from './rules/noConsecutiveDays'
import { validateUnavailableDay } from './rules/unavailableDay'
import { validateUnavailableDate } from './rules/unavailableDate'
import { validateUnavailableTime } from './rules/unavailableTime'
import { validateRequiredTitlePerShift } from './rules/requiredTitlePerShift'
import { validateMinStaffPerShift } from './rules/minStaffPerShift'
import { validateMaxStaffPerShift } from './rules/maxStaffPerShift'
import { validateNotTogetherShift } from './rules/notTogetherShift'
import { validateMustTogetherShift } from './rules/mustTogetherShift'
import { validateTeacherNoOverlap } from './rules/teacherNoOverlap'
import { validateClassNoOverlap } from './rules/classNoOverlap'

/** Kısıt tipi → kural fonksiyonu eşleştirmesi */
const ruleMap: Record<ConstraintType, RuleFunction | undefined> = {
  max_shifts_per_week: validateMaxShiftsPerWeek,
  max_shifts_per_month: validateMaxShiftsPerMonth,
  max_hours_per_week: validateMaxHoursPerWeek,
  min_rest_hours: validateMinRestHours,
  no_consecutive_days: validateNoConsecutiveDays,
  unavailable_day: validateUnavailableDay,
  unavailable_date: validateUnavailableDate,
  unavailable_time: validateUnavailableTime,
  required_title_per_shift: validateRequiredTitlePerShift,
  min_staff_per_shift: validateMinStaffPerShift,
  max_staff_per_shift: validateMaxStaffPerShift,
  not_together_shift: validateNotTogetherShift,
  must_together_shift: validateMustTogetherShift,
  teacher_no_overlap: validateTeacherNoOverlap,
  class_no_overlap: validateClassNoOverlap,
  custom: undefined, // custom kurallar harici olarak ele alınır
}

/**
 * Tek bir aday slot için tüm ilgili kısıtları kontrol eder.
 * Yalnızca geçersiz (isValid: false) sonuçları döndürür.
 *
 * @param candidateSlot - Doğrulanacak aday slot
 * @param existingSlots - Mevcut tüm aktif slotlar
 * @param constraints   - Uygulanacak kısıtlar
 * @returns Kırılan kısıtların listesi (boş ise sorun yok)
 */
export function validateSlot(
  candidateSlot: ScheduleSlot,
  existingSlots: ScheduleSlot[],
  constraints: Constraint[]
): ValidationResult[] {
  const violations: ValidationResult[] = []

  const applicableConstraints = constraints.filter((c) => {
    if (!c.isActive) return false
    // staffId null → herkese uygulanır; dolu → sadece o kişiye
    if (c.staffId && c.staffId !== candidateSlot.staffId) return false
    return true
  })

  for (const constraint of applicableConstraints) {
    const ruleFn = ruleMap[constraint.type]
    if (!ruleFn) continue

    const result = ruleFn(existingSlots, constraint, candidateSlot)
    if (!result.isValid) {
      violations.push(result)
    }
  }

  return violations
}

/**
 * Tüm slotları toplu kontrol eder (program doğrulama için).
 * Her slotu diğer slotlar bağlamında kontrol eder.
 *
 * @param slots       - Kontrol edilecek tüm slotlar
 * @param constraints - Uygulanacak kısıtlar
 * @returns Tüm kırılan kısıtların listesi
 */
export function validateSchedule(
  slots: ScheduleSlot[],
  constraints: Constraint[]
): ValidationResult[] {
  const allViolations: ValidationResult[] = []

  for (let i = 0; i < slots.length; i++) {
    const candidateSlot = slots[i]
    const otherSlots = slots.filter((_, idx) => idx !== i)
    const violations = validateSlot(candidateSlot, otherSlots, constraints)
    allViolations.push(...violations)
  }

  // Aynı kısıt+personel çiftinin tekrarını kaldır
  const seen = new Set<string>()
  return allViolations.filter((v) => {
    const key = `${v.constraintId}:${v.staffId ?? ''}:${v.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
