import { describe, it, expect } from 'vitest'
import { validateSlot, validateSchedule } from './validator'
import type { ScheduleSlot } from '../types/schedule.types'
import type { Constraint } from '../types/constraint.types'

// Yardımcı: hızlı slot oluşturucu
function makeSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: 'slot-1',
    scheduleId: 'sched-1',
    staffId: 'staff-1',
    departmentId: 'dept-1',
    date: '2026-05-05', // Pazartesi
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '16:00',
    status: 'active',
    ...overrides,
  }
}

function makeConstraint(
  overrides: Partial<Constraint> = {}
): Constraint {
  return {
    id: 'c-1',
    institutionId: 'inst-1',
    type: 'max_shifts_per_week',
    value: {},
    isActive: true,
    ...overrides,
  }
}

describe('Constraint Validator', () => {
  // ─── 1. Haftada max 3 nöbet ───
  it('haftada max 3 nöbet → 4. nöbette false dönsün', () => {
    const existingSlots: ScheduleSlot[] = [
      makeSlot({ id: 's1', date: '2026-05-04', dayOfWeek: 0 }), // Pazar
      makeSlot({ id: 's2', date: '2026-05-05', dayOfWeek: 1 }), // Pazartesi
      makeSlot({ id: 's3', date: '2026-05-06', dayOfWeek: 2 }), // Salı
    ]

    const constraints: Constraint[] = [
      makeConstraint({
        type: 'max_shifts_per_week',
        value: { max: 3 },
      }),
    ]

    // 4. nöbet adayı — Çarşamba
    const candidate = makeSlot({
      id: 's4',
      date: '2026-05-07',
      dayOfWeek: 3,
    })

    const violations = validateSlot(candidate, existingSlots, constraints)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].isValid).toBe(false)
    expect(violations[0].constraintType).toBe('max_shifts_per_week')
  })

  // ─── 2. Müsait olmayan gün ───
  it('müsait olmayan gün → o gün false dönsün', () => {
    const constraints: Constraint[] = [
      makeConstraint({
        type: 'unavailable_day',
        staffId: 'staff-1',
        value: { dayOfWeek: [6, 0] }, // Cumartesi, Pazar
      }),
    ]

    const candidate = makeSlot({
      date: '2026-05-10', // Cumartesi
      dayOfWeek: 6,
    })

    const violations = validateSlot(candidate, [], constraints)
    expect(violations.length).toBe(1)
    expect(violations[0].isValid).toBe(false)
    expect(violations[0].message).toContain('müsait değil')
  })

  // ─── 3. Min dinlenme 12 saat ───
  it('min dinlenme 12 saat → 8 saat sonraki nöbet false dönsün', () => {
    const existingSlots: ScheduleSlot[] = [
      makeSlot({
        id: 's1',
        date: '2026-05-05',
        startTime: '16:00',
        endTime: '23:00', // 23:00 bitiş
      }),
    ]

    const constraints: Constraint[] = [
      makeConstraint({
        type: 'min_rest_hours',
        value: { hours: 12 },
      }),
    ]

    // Ertesi gün 07:00 başlangıç → 8 saat dinlenme (< 12)
    const candidate = makeSlot({
      id: 's2',
      date: '2026-05-06',
      dayOfWeek: 2,
      startTime: '07:00',
      endTime: '15:00',
    })

    const violations = validateSlot(candidate, existingSlots, constraints)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].isValid).toBe(false)
    expect(violations[0].message).toContain('dinlenme')
  })

  // ─── 4. Öğretmen çakışma ───
  it('aynı anda 2 öğretmen çakışması → false dönsün', () => {
    const existingSlots: ScheduleSlot[] = [
      makeSlot({
        id: 's1',
        startTime: '08:00',
        endTime: '10:00',
      }),
    ]

    const constraints: Constraint[] = [
      makeConstraint({
        type: 'teacher_no_overlap',
        value: {},
      }),
    ]

    // Aynı staffId, aynı gün, çakışan saat
    const candidate = makeSlot({
      id: 's2',
      startTime: '09:00',
      endTime: '11:00',
    })

    const violations = validateSlot(candidate, existingSlots, constraints)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].isValid).toBe(false)
    expect(violations[0].message).toContain('iki yerde')
  })

  // ─── 5. Tüm kısıtlar geçince boş array ───
  it('tüm kısıtlar geçince → boş array dönsün', () => {
    const existingSlots: ScheduleSlot[] = [
      makeSlot({ id: 's1', date: '2026-05-05' }),
    ]

    const constraints: Constraint[] = [
      makeConstraint({
        type: 'max_shifts_per_week',
        value: { max: 10 }, // çok yüksek limit
      }),
      makeConstraint({
        id: 'c-2',
        type: 'unavailable_day',
        staffId: 'staff-1',
        value: { dayOfWeek: [0] }, // sadece Pazar
      }),
    ]

    // Salı günü, limit altında — herşey geçerli
    const candidate = makeSlot({
      id: 's2',
      date: '2026-05-06',
      dayOfWeek: 2,
    })

    const violations = validateSlot(candidate, existingSlots, constraints)
    expect(violations).toEqual([])
  })

  // ─── 6. validateSchedule toplu kontrol ───
  it('validateSchedule tüm slotları kontrol eder', () => {
    const slots: ScheduleSlot[] = [
      makeSlot({ id: 's1', date: '2026-05-05', startTime: '08:00', endTime: '10:00' }),
      makeSlot({ id: 's2', date: '2026-05-05', startTime: '09:00', endTime: '11:00' }), // çakışma!
    ]

    const constraints: Constraint[] = [
      makeConstraint({ type: 'teacher_no_overlap', value: {} }),
    ]

    const violations = validateSchedule(slots, constraints)
    expect(violations.length).toBeGreaterThan(0)
  })
})
