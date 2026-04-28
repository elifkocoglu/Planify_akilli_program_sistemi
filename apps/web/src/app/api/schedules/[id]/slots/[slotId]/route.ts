import { NextResponse } from 'next/server'
import { requireAuth, isAuthError, canAccessDepartment } from '@/lib/api/auth-helpers'
import {
  validateSlot,
  getDayOfWeek,
  type ScheduleSlot,
  type Constraint,
  type ConstraintType,
} from '@planify/shared'

interface RouteParams {
  params: { id: string; slotId: string }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/schedules/[id]/slots/[slotId] — Slot güncelle
// ─────────────────────────────────────────────────────────────
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // 1. Auth + rol kontrolü
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { id: scheduleId, slotId } = params

    // 2. Schedule kontrol
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
        { success: false, error: 'Sadece taslak programların slotları düzenlenebilir' },
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

    // 3. Mevcut slotu çek
    const { data: existingSlot, error: slotError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('id', slotId)
      .eq('schedule_id', scheduleId)
      .single()

    if (slotError || !existingSlot) {
      return NextResponse.json(
        { success: false, error: 'Slot bulunamadı' },
        { status: 404 }
      )
    }

    // 4. Body al
    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.staffId !== undefined) updateData.staff_id = body.staffId
    if (body.startTime !== undefined) updateData.start_time = body.startTime
    if (body.endTime !== undefined) updateData.end_time = body.endTime
    if (body.roomId !== undefined) updateData.room_id = body.roomId
    if (body.titleId !== undefined) updateData.title_id = body.titleId
    if (body.date !== undefined) {
      updateData.date = body.date
      updateData.day_of_week = getDayOfWeek(body.date)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Güncellenecek alan belirtilmedi' },
        { status: 400 }
      )
    }

    // 5. Kısıt kontrolü: Güncellenmiş slotu doğrula
    // Diğer slotları çek (bu slot hariç)
    const [otherSlotsResult, constraintsResult] = await Promise.all([
      supabase
        .from('schedule_slots')
        .select('id, schedule_id, staff_id, department_id, room_id, title_id, date, day_of_week, start_time, end_time, status')
        .eq('schedule_id', scheduleId)
        .eq('status', 'active')
        .neq('id', slotId),
      supabase
        .from('constraints')
        .select('id, institution_id, department_id, staff_id, type, value, is_active')
        .eq('institution_id', schedule.institution_id)
        .eq('is_active', true),
    ])

    const otherSlots: ScheduleSlot[] = (otherSlotsResult.data ?? []).map((s) => ({
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

    // Güncellenmiş aday slot
    const candidateSlot: ScheduleSlot = {
      id: slotId,
      scheduleId,
      staffId: (updateData.staff_id as string) ?? existingSlot.staff_id,
      departmentId: existingSlot.department_id ?? schedule.department_id,
      roomId: ((updateData.room_id as string) ?? existingSlot.room_id) || undefined,
      titleId: ((updateData.title_id as string) ?? existingSlot.title_id) || undefined,
      date: (updateData.date as string) ?? existingSlot.date,
      dayOfWeek: (updateData.day_of_week as number) ?? existingSlot.day_of_week,
      startTime: (updateData.start_time as string) ?? existingSlot.start_time,
      endTime: (updateData.end_time as string) ?? existingSlot.end_time,
      status: 'active',
    }

    const violations = validateSlot(candidateSlot, otherSlots, constraints)

    if (violations.length > 0) {
      return NextResponse.json(
        { success: false, violations },
        { status: 400 }
      )
    }

    // 6. Güncelle
    const { data: updatedSlot, error: updateError } = await supabase
      .from('schedule_slots')
      .update(updateData)
      .eq('id', slotId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Slot güncellenemedi: ${updateError.message}` },
        { status: 500 }
      )
    }

    // 7. Audit log — eski bilgiyi kaydet
    await supabase.from('audit_logs').insert({
      institution_id: schedule.institution_id,
      user_id: profile.id,
      action: 'updated',
      table_name: 'schedule_slots',
      record_id: slotId,
      old_value: {
        staff_id: existingSlot.staff_id,
        date: existingSlot.date,
        start_time: existingSlot.start_time,
        end_time: existingSlot.end_time,
      },
      new_value: updateData,
    })

    return NextResponse.json({ success: true, slot: updatedSlot })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/schedules/[id]/slots/[slotId] — Slot sil (soft)
// ─────────────────────────────────────────────────────────────
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    // 1. Auth + rol kontrolü
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { id: scheduleId, slotId } = params

    // 2. Schedule kontrol
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
        { success: false, error: 'Sadece taslak programların slotları silinebilir' },
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

    // 3. Slot varlığını kontrol et
    const { data: existingSlot, error: slotError } = await supabase
      .from('schedule_slots')
      .select('id, staff_id, date, start_time, end_time')
      .eq('id', slotId)
      .eq('schedule_id', scheduleId)
      .single()

    if (slotError || !existingSlot) {
      return NextResponse.json(
        { success: false, error: 'Slot bulunamadı' },
        { status: 404 }
      )
    }

    // 4. Soft delete — status: 'cancelled'
    const { error: updateError } = await supabase
      .from('schedule_slots')
      .update({ status: 'cancelled' })
      .eq('id', slotId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Slot silinemedi: ${updateError.message}` },
        { status: 500 }
      )
    }

    // 5. Audit log
    await supabase.from('audit_logs').insert({
      institution_id: schedule.institution_id,
      user_id: profile.id,
      action: 'deleted',
      table_name: 'schedule_slots',
      record_id: slotId,
      old_value: {
        staff_id: existingSlot.staff_id,
        date: existingSlot.date,
        start_time: existingSlot.start_time,
        end_time: existingSlot.end_time,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
