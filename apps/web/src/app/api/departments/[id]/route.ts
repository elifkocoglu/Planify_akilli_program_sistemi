import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

// ─────────────────────────────────────────────────────────────
// PATCH /api/departments/[id] — Departman güncelle
// ─────────────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(['institution_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const body = await request.json()

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.type !== undefined) updateData.type = body.type

    const { data: department, error: updateError } = await supabase
      .from('departments')
      .update(updateData)
      .eq('id', params.id)
      .eq('institution_id', profile.institution_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Departman güncellenemedi: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, department })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/departments/[id] — Departman sil
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(['institution_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    // Departmanda personel var mı kontrol et
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', params.id)
      .eq('is_active', true)

    if (count && count > 0) {
      return NextResponse.json(
        { success: false, error: `Bu departmanda ${count} aktif personel var. Önce personelleri taşıyın.` },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('departments')
      .delete()
      .eq('id', params.id)
      .eq('institution_id', profile.institution_id)

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `Departman silinemedi: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: profile.institution_id,
      user_id: profile.id,
      action: 'deleted',
      table_name: 'departments',
      record_id: params.id,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
