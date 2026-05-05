import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

// ─────────────────────────────────────────────────────────────
// PATCH /api/titles/[id] — Unvan güncelle
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
    if (body.minRequiredPerShift !== undefined) updateData.min_required_per_shift = body.minRequiredPerShift

    const { data: title, error: updateError } = await supabase
      .from('titles')
      .update(updateData)
      .eq('id', params.id)
      .eq('institution_id', profile.institution_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { success: false, error: `Unvan güncellenemedi: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, title })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/titles/[id] — Unvan sil
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(['institution_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    // Bu unvanda personel var mı kontrol et
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('title_id', params.id)
      .eq('is_active', true)

    if (count && count > 0) {
      return NextResponse.json(
        { success: false, error: `Bu unvanda ${count} aktif personel var. Önce personellerin unvanını değiştirin.` },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('titles')
      .delete()
      .eq('id', params.id)
      .eq('institution_id', profile.institution_id)

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: `Unvan silinemedi: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
