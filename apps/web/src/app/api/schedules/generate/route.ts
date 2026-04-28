import { NextResponse } from 'next/server'
import { requireAuth, isAuthError, canAccessDepartment } from '@/lib/api/auth-helpers'
import {
  generateSchedule,
  type StaffMember,
  type Constraint,
  type ScheduleSlot,
  type GeneratorInput,
  type ConstraintType,
} from '@planify/shared'
import type { GenerateScheduleInput } from '@/lib/api/types'

// ─────────────────────────────────────────────────────────────
// POST /api/schedules/generate — Otomatik program üret
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    // 1. Auth + rol kontrolü
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    // 2. Body doğrula
    const body: GenerateScheduleInput = await request.json()
    const { scheduleId, dailySlotCount, slotDuration, startHour } = body

    if (!scheduleId || !dailySlotCount || !slotDuration || !startHour) {
      return NextResponse.json(
        { success: false, error: 'Tüm alanlar zorunludur: scheduleId, dailySlotCount, slotDuration, startHour' },
        { status: 400 }
      )
    }

    // 3. Schedule'ı çek
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('id, institution_id, department_id, start_date, end_date, type, status')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Program bulunamadı' },
        { status: 404 }
      )
    }

    // 4. Status kontrolü
    if (schedule.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Sadece taslak programlar düzenlenebilir' },
        { status: 400 }
      )
    }

    // 5. Departman erişim kontrolü
    const hasAccess = await canAccessDepartment(supabase, profile, schedule.department_id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Bu programa erişim yetkiniz bulunmuyor' },
        { status: 403 }
      )
    }

    // 6. Supabase'den verileri çek

    // 6a. Departmana ait aktif personel listesi
    const { data: dbProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, title_id, department_id, weekly_max_hours, monthly_max_shifts')
      .eq('department_id', schedule.department_id)
      .eq('is_active', true)

    if (profilesError) {
      return NextResponse.json(
        { success: false, error: `Personel listesi alınamadı: ${profilesError.message}` },
        { status: 500 }
      )
    }

    // 6b. Aktif kısıtlar
    const { data: dbConstraints, error: constraintsError } = await supabase
      .from('constraints')
      .select('id, institution_id, department_id, staff_id, type, value, is_active')
      .eq('institution_id', schedule.institution_id)
      .eq('is_active', true)

    if (constraintsError) {
      return NextResponse.json(
        { success: false, error: `Kısıtlar alınamadı: ${constraintsError.message}` },
        { status: 500 }
      )
    }

    // 6c. Mevcut aktif slotlar
    const { data: dbSlots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('id, schedule_id, staff_id, department_id, room_id, title_id, date, day_of_week, start_time, end_time, status')
      .eq('schedule_id', scheduleId)
      .eq('status', 'active')

    if (slotsError) {
      return NextResponse.json(
        { success: false, error: `Mevcut slotlar alınamadı: ${slotsError.message}` },
        { status: 500 }
      )
    }

    // 7. Supabase verisini @planify/shared tiplerine dönüştür
    const staff: StaffMember[] = (dbProfiles ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
      titleId: p.title_id ?? undefined,
      departmentId: p.department_id,
      weeklyMaxHours: p.weekly_max_hours ?? undefined,
      monthlyMaxShifts: p.monthly_max_shifts ?? undefined,
    }))

    const constraints: Constraint[] = (dbConstraints ?? []).map((c) => ({
      id: c.id,
      institutionId: c.institution_id,
      departmentId: c.department_id ?? undefined,
      staffId: c.staff_id ?? undefined,
      type: c.type as ConstraintType,
      value: (c.value as Record<string, unknown>) ?? {},
      isActive: c.is_active,
    }))

    const existingSlots: ScheduleSlot[] = (dbSlots ?? []).map((s) => ({
      id: s.id,
      scheduleId: s.schedule_id,
      staffId: s.staff_id,
      departmentId: s.department_id ?? schedule.department_id,
      roomId: s.room_id ?? undefined,
      titleId: s.title_id ?? undefined,
      date: s.date,
      dayOfWeek: s.day_of_week,
      startTime: s.start_time,
      endTime: s.end_time,
      status: s.status as 'active' | 'swapped' | 'cancelled',
    }))

    // 8. generateSchedule() çağır
    const generatorInput: GeneratorInput = {
      staff,
      constraints,
      existingSlots,
      dateRange: {
        start: schedule.start_date,
        end: schedule.end_date,
      },
      dailySlotCount,
      slotDuration,
      startHour,
      scheduleId,
      departmentId: schedule.department_id,
      scheduleType: schedule.type as 'duty' | 'lesson',
    }

    const result = generateSchedule(generatorInput)

    // 9. Mevcut active slotları sil
    const { error: deleteError } = await supabase
      .from('schedule_slots')
      .delete()
      .eq('schedule_id', scheduleId)
      .eq('status', 'active')

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `Mevcut slotlar silinemedi: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // 10. Yeni slotları batch insert et
    if (result.slots.length > 0) {
      const slotsToInsert = result.slots.map((slot) => ({
        schedule_id: scheduleId,
        staff_id: slot.staffId,
        department_id: slot.departmentId,
        room_id: slot.roomId ?? null,
        title_id: slot.titleId ?? null,
        date: slot.date,
        day_of_week: slot.dayOfWeek,
        start_time: slot.startTime,
        end_time: slot.endTime,
        status: 'active' as const,
      }))

      const { error: insertError } = await supabase
        .from('schedule_slots')
        .insert(slotsToInsert)

      if (insertError) {
        return NextResponse.json(
          { success: false, error: `Slotlar eklenemedi: ${insertError.message}` },
          { status: 500 }
        )
      }
    }

    // 11. Audit log
    await supabase.from('audit_logs').insert({
      institution_id: schedule.institution_id,
      user_id: profile.id,
      action: 'created',
      table_name: 'schedule_slots',
      record_id: scheduleId,
      new_value: {
        slotCount: result.slots.length,
        unresolvedCount: result.unresolved.length,
      },
    })

    // 12. Response
    return NextResponse.json({
      success: true,
      generatedCount: result.slots.length,
      unresolved: result.unresolved,
      warnings: result.warnings,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
