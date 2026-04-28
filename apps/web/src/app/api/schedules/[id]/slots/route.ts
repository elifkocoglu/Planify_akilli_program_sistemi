import { NextResponse } from 'next/server'
import { requireAuth, isAuthError, canAccessDepartment } from '@/lib/api/auth-helpers'
import {
  validateSlot,
  getDayOfWeek,
  type ScheduleSlot,
  type Constraint,
  type ConstraintType,
} from '@planify/shared'
import type { SlotInput } from '@/lib/api/types'

interface RouteParams {
  params: { id: string }
}

// ─────────────────────────────────────────────────────────────
// POST /api/schedules/[id]/slots — Tek slot ekle (manuel)
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request, { params }: RouteParams) {
  try {
    // 1. Auth + rol kontrolü
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { id: scheduleId } = params

    // 2. Schedule'ı kontrol et
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('id, status, department_id, institution_id')
      .eq('id', scheduleId)
      .eq('institution_id', profile.institution_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Program bulunamadı' },
        { status: 404 }
      )
    }

    if (schedule.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Sadece taslak programlara slot eklenebilir' },
        { status: 400 }
      )
    }

    // Departman erişim kontrolü
    const hasAccess = await canAccessDepartment(supabase, profile, schedule.department_id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Bu programa erişim yetkiniz bulunmuyor' },
        { status: 403 }
      )
    }

    // 3. Body doğrula
    const body: SlotInput = await request.json()
    const { staffId, date, startTime, endTime, roomId, titleId } = body

    if (!staffId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Zorunlu alanlar: staffId, date, startTime, endTime' },
        { status: 400 }
      )
    }

    // 4. Mevcut slotları ve kısıtları çek (validateSlot için)
    const [slotsResult, constraintsResult] = await Promise.all([
      supabase
        .from('schedule_slots')
        .select('id, schedule_id, staff_id, department_id, room_id, title_id, date, day_of_week, start_time, end_time, status')
        .eq('schedule_id', scheduleId)
        .eq('status', 'active'),
      supabase
        .from('constraints')
        .select('id, institution_id, department_id, staff_id, type, value, is_active')
        .eq('institution_id', schedule.institution_id)
        .eq('is_active', true),
    ])

    const existingSlots: ScheduleSlot[] = (slotsResult.data ?? []).map((s) => ({
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

    const constraints: Constraint[] = (constraintsResult.data ?? []).map((c) => ({
      id: c.id,
      institutionId: c.institution_id,
      departmentId: c.department_id ?? undefined,
      staffId: c.staff_id ?? undefined,
      type: c.type as ConstraintType,
      value: (c.value as Record<string, unknown>) ?? {},
      isActive: c.is_active,
    }))

    // 5. Aday slot oluştur
    const candidateSlot: ScheduleSlot = {
      id: `manual-${Date.now()}`,
      scheduleId,
      staffId,
      departmentId: schedule.department_id,
      roomId: roomId ?? undefined,
      titleId: titleId ?? undefined,
      date,
      dayOfWeek: getDayOfWeek(date),
      startTime,
      endTime,
      status: 'active',
    }

    // 6. Kısıt kontrolü
    const violations = validateSlot(candidateSlot, existingSlots, constraints)

    if (violations.length > 0) {
      return NextResponse.json(
        { success: false, violations },
        { status: 400 }
      )
    }

    // 7. Insert et
    const { data: insertedSlot, error: insertError } = await supabase
      .from('schedule_slots')
      .insert({
        schedule_id: scheduleId,
        staff_id: staffId,
        department_id: schedule.department_id,
        room_id: roomId ?? null,
        title_id: titleId ?? null,
        date,
        day_of_week: getDayOfWeek(date),
        start_time: startTime,
        end_time: endTime,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Slot eklenemedi: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, slot: insertedSlot })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
