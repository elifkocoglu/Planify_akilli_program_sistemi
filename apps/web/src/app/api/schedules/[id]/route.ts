import { NextResponse } from 'next/server'
import { requireAuth, isAuthError, canAccessDepartment } from '@/lib/api/auth-helpers'

interface RouteParams {
  params: { id: string }
}

// ─────────────────────────────────────────────────────────────
// GET /api/schedules/[id] — Schedule detayı + slot listesi
// ─────────────────────────────────────────────────────────────
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { id } = params

    // Schedule'ı çek
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*, departments(name)')
      .eq('id', id)
      .eq('institution_id', profile.institution_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Program bulunamadı' },
        { status: 404 }
      )
    }

    // Role bazlı erişim kontrolü
    if (profile.role === 'staff' && schedule.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Bu programa erişim yetkiniz bulunmuyor' },
        { status: 403 }
      )
    }

    if (profile.role === 'department_admin') {
      const hasAccess = await canAccessDepartment(supabase, profile, schedule.department_id)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Bu programa erişim yetkiniz bulunmuyor' },
          { status: 403 }
        )
      }
    }

    // Slot listesini çek
    const { data: slots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('*, profiles(full_name)')
      .eq('schedule_id', id)
      .neq('status', 'cancelled')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (slotsError) {
      return NextResponse.json(
        { success: false, error: `Slotlar getirilemedi: ${slotsError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, schedule, slots: slots ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/schedules/[id] — Schedule güncelle
// ─────────────────────────────────────────────────────────────
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { id } = params
    const body = await request.json()

    // Mevcut schedule'ı kontrol et
    const { data: existing, error: fetchError } = await supabase
      .from('schedules')
      .select('id, status, department_id, institution_id')
      .eq('id', id)
      .eq('institution_id', profile.institution_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Program bulunamadı' },
        { status: 404 }
      )
    }

    // Departman erişim kontrolü
    const hasAccess = await canAccessDepartment(supabase, profile, existing.department_id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Bu programa erişim yetkiniz bulunmuyor' },
        { status: 403 }
      )
    }

    // published → draft geri alınamaz
    if (existing.status === 'published' && body.status === 'draft') {
      return NextResponse.json(
        { success: false, error: 'Yayınlanmış bir program taslağa geri alınamaz' },
        { status: 400 }
      )
    }

    // Güncellenebilir alanlar
    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.status !== undefined) updateData.status = body.status

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Güncellenecek alan belirtilmedi' },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('schedules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Güncelleme başarısız: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: profile.institution_id,
      user_id: profile.id,
      action: 'updated',
      table_name: 'schedules',
      record_id: id,
      old_value: { status: existing.status },
      new_value: updateData,
    })

    return NextResponse.json({ success: true, schedule: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/schedules/[id] — Schedule sil (sadece draft)
// ─────────────────────────────────────────────────────────────
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { id } = params

    // Mevcut schedule'ı kontrol et
    const { data: existing, error: fetchError } = await supabase
      .from('schedules')
      .select('id, status, department_id, title')
      .eq('id', id)
      .eq('institution_id', profile.institution_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Program bulunamadı' },
        { status: 404 }
      )
    }

    // Departman erişim kontrolü
    const hasAccess = await canAccessDepartment(supabase, profile, existing.department_id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Bu programa erişim yetkiniz bulunmuyor' },
        { status: 403 }
      )
    }

    // Sadece draft silinebilir
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Sadece taslak programlar silinebilir' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `Silme başarısız: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: profile.institution_id,
      user_id: profile.id,
      action: 'deleted',
      table_name: 'schedules',
      record_id: id,
      old_value: { title: existing.title, status: existing.status },
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
