import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

// ─────────────────────────────────────────────────────────────
// PATCH /api/constraints/[id] — Kısıt güncelle
// ─────────────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const body = await request.json()

    // Kısıtın bu kuruma ait olduğunu doğrula
    const { data: existing } = await supabase
      .from('constraints')
      .select('id, institution_id')
      .eq('id', params.id)
      .eq('institution_id', profile.institution_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Kısıt bulunamadı' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.value !== undefined) updateData.value = body.value

    const { data: constraint, error: updateError } = await supabase
      .from('constraints')
      .update(updateData)
      .eq('id', params.id)
      .select('id, institution_id, department_id, staff_id, type, value, is_active, created_at')
      .single()

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Kısıt güncellenemedi: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: profile.institution_id,
      user_id: profile.id,
      action: 'updated',
      table_name: 'constraints',
      record_id: params.id,
      new_value: updateData,
    })

    return NextResponse.json({ success: true, constraint })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/constraints/[id] — Kısıt sil
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    // Kısıtın bu kuruma ait olduğunu doğrula
    const { data: existing } = await supabase
      .from('constraints')
      .select('id, institution_id')
      .eq('id', params.id)
      .eq('institution_id', profile.institution_id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Kısıt bulunamadı' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabase
      .from('constraints')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `Kısıt silinemedi: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: profile.institution_id,
      user_id: profile.id,
      action: 'deleted',
      table_name: 'constraints',
      record_id: params.id,
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
