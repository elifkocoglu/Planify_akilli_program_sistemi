import type { ScheduleSlot } from '../types/schedule.types'
import type {
  GeneratorInput,
  GeneratorResult,
  UnresolvedSlot,
} from '../types/generator.types'
import { validateSlot } from '../constraints/validator'
import {
  getDatesInRange,
  getDayOfWeek,
  addOneDay,
} from '../utils'

/**
 * Gece yarısını geçen nöbetlerde bitiş saatini hesaplar.
 *
 * Örnek: startTime="09:00", durationMinutes=1440 (24 saat)
 *   → endTime="09:00", nextDay=true
 *
 * PostgreSQL TIME tipi 24:00'ı geçemez; bu helper ile
 * endTime her zaman 00:00-23:59 aralığında tutulur.
 */
function calculateEndTime(
  startTime: string,
  durationMinutes: number
): { endTime: string; nextDay: boolean } {
  const [h, m] = startTime.split(':').map(Number)
  const totalMinutes = h * 60 + m + durationMinutes

  const endH = Math.floor(totalMinutes / 60) % 24
  const endM = totalMinutes % 60
  const nextDay = totalMinutes >= 24 * 60

  return {
    endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    nextDay,
  }
}


/** Personelin belirtilen tarihte onaylı izni olup olmadığını kontrol eder */
function isOnLeave(
  staffId: string,
  date: string,
  leaves: GeneratorInput['approvedLeaves']
): boolean {
  if (!leaves) return false
  return leaves.some(
    (leave) =>
      leave.staffId === staffId &&
      date >= leave.startDate &&
      date <= leave.endDate
  )
}

/**
 * Otomatik program üretici.
 * Kısıtlara uygun şekilde personellere slot atar.
 *
 * Algoritma:
 * 1. Tarih aralığındaki her gün için döngü
 * 2. Her gün dailySlotCount kadar slot oluşturmaya çalış
 * 3. Her slot için en uygun personeli bul (adil dağılım)
 * 4. Kimse uygun değilse UnresolvedSlot olarak kaydet
 */
export function generateSchedule(input: GeneratorInput): GeneratorResult {
  const {
    staff,
    constraints,
    existingSlots,
    dateRange,
    dailySlotCount,
    slotDuration,
    startHour,
    scheduleId,
    departmentId,
  } = input

  const allSlots: ScheduleSlot[] = [...existingSlots]
  const unresolved: UnresolvedSlot[] = []
  const warnings: string[] = []

  if (staff.length === 0) {
    warnings.push('Personel listesi boş, slot oluşturulamadı')
    return { slots: [], unresolved: [], warnings }
  }

  const dates = getDatesInRange(dateRange.start, dateRange.end)

  // Her personelin mevcut slot sayısını takip et (adil dağılım)
  const staffSlotCount = new Map<string, number>()
  for (const s of staff) {
    const existingCount = allSlots.filter(
      (slot) => slot.staffId === s.id && slot.status === 'active'
    ).length
    staffSlotCount.set(s.id, existingCount)
  }

  let slotCounter = 0

  for (const date of dates) {
    const dayOfWeek = getDayOfWeek(date)

    for (let slotIndex = 0; slotIndex < dailySlotCount; slotIndex++) {
      // Slot başlangıç zamanını hesapla
      const [startH, startM] = startHour.split(':').map(Number)
      const slotStartMinutes = startH * 60 + startM + slotIndex * slotDuration

      const slotStartTime = `${String(Math.floor(slotStartMinutes / 60) % 24).padStart(2, '0')}:${String(slotStartMinutes % 60).padStart(2, '0')}`

      // Slot bitiş zamanını hesapla — gece yarısını geçerse ertesi gün
      const { endTime: slotEndTime, nextDay } = calculateEndTime(
        slotStartTime,
        slotDuration
      )
      const slotEndDate = nextDay ? addOneDay(date) : date

      // Personelleri en az nöbet tutandan en çok tutana sırala
      const sortedStaff = [...staff].sort((a, b) => {
        const countA = staffSlotCount.get(a.id) ?? 0
        const countB = staffSlotCount.get(b.id) ?? 0
        return countA - countB
      })

      let assigned = false
      const attemptedStaffIds: string[] = []

      for (const member of sortedStaff) {
        if (isOnLeave(member.id, date, input.approvedLeaves)) {
          continue // İzinliyse bu personeli atla
        }

        const candidateSlot: ScheduleSlot = {
          id: `gen-${scheduleId}-${slotCounter++}`,
          scheduleId,
          staffId: member.id,
          departmentId,
          titleId: member.titleId,
          date,
          endDate: slotEndDate !== date ? slotEndDate : undefined,
          dayOfWeek,
          startTime: slotStartTime,
          endTime: slotEndTime,
          status: 'active',
        }

        const violations = validateSlot(candidateSlot, allSlots, constraints)
        attemptedStaffIds.push(member.id)

        if (violations.length === 0) {
          allSlots.push(candidateSlot)
          staffSlotCount.set(
            member.id,
            (staffSlotCount.get(member.id) ?? 0) + 1
          )
          assigned = true
          break
        }
      }

      if (!assigned) {
        unresolved.push({
          date,
          reason: `${date} ${slotStartTime}-${slotEndTime}${nextDay ? ' (+1 gün)' : ''} için uygun personel bulunamadı`,
          attemptedStaffIds,
        })
      }
    }
  }

  // Sadece yeni oluşturulan slotları döndür
  const newSlots = allSlots.filter((s) => s.id.startsWith('gen-'))

  if (unresolved.length > 0) {
    warnings.push(
      `${unresolved.length} slot için uygun personel bulunamadı`
    )
  }

  return { slots: newSlots, unresolved, warnings }
}
