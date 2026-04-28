import { NextResponse } from 'next/server'
import { requireAuth, isAuthError, canAccessDepartment } from '@/lib/api/auth-helpers'

interface RouteParams {
  params: { id: string }
}

// ─────────────────────────────────────────────────────────────
// POST /api/schedules/[id]/publish — Programı yayınla
// ─────────────────────────────────────────────────────────────
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    // 1. Auth + rol kontrolü
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { id } = params

    // 2. Schedule'ı çek
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('id, title, status, department_id, institution_id')
      .eq('id', id)
      .eq('institution_id', profile.institution_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Program bulunamadı' },
        { status: 404 }
      )
    }

    // 3. Draft kontrolü
    if (schedule.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Sadece taslak programlar yayınlanabilir' },
        { status: 400 }
      )
    }

    // 4. Departman erişim kontrolü
    const hasAccess = await canAccessDepartment(supabase, profile, schedule.department_id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Bu programa erişim yetkiniz bulunmuyor' },
        { status: 403 }
      )
    }

    // 5. Unresolved slot uyarısı (engellemez, sadece bilgi)
    const { data: activeSlots } = await supabase
      .from('schedule_slots')
      .select('id')
      .eq('schedule_id', id)
      .eq('status', 'active')

    const warnings: string[] = []
    if (!activeSlots || activeSlots.length === 0) {
      warnings.push('Dikkat: Bu programda hiç aktif slot bulunmuyor')
    }

    // 6. Status → 'published' güncelle
    const { error: updateError } = await supabase
      .from('schedules')
      .update({ status: 'published' })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Yayınlama başarısız: ${updateError.message}` },
        { status: 500 }
      )
    }

    // 7. Departmandaki tüm staff'e bildirim gönder
    const { data: departmentStaff } = await supabase
      .from('profiles')
      .select('id')
      .eq('department_id', schedule.department_id)
      .eq('is_active', true)

    let notifiedCount = 0

    if (departmentStaff && departmentStaff.length > 0) {
      const notifications = departmentStaff.map((staff) => ({
        user_id: staff.id,
        institution_id: schedule.institution_id,
        title: 'Yeni Program Yayınlandı',
        body: `${schedule.title} programı yayınlandı`,
        type: 'schedule_published' as const,
        related_id: id,
        is_read: false,
      }))

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (!notifError) {
        notifiedCount = notifications.length
      }
    }

    // 8. Audit log
    await supabase.from('audit_logs').insert({
      institution_id: schedule.institution_id,
      user_id: profile.id,
      action: 'published',
      table_name: 'schedules',
      record_id: id,
      old_value: { status: 'draft' },
      new_value: { status: 'published', notifiedCount },
    })

    return NextResponse.json({
      success: true,
      notifiedCount,
      warnings: warnings.length > 0 ? warnings : undefined,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
