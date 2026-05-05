import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'
import { nanoid } from 'nanoid'

// ─────────────────────────────────────────────────────────────
// POST /api/invitations/code — Davet kodu oluştur
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const body = await request.json()
    const { role, departmentId, maxUses, expiresInDays } = body

    if (!role || !departmentId) {
      return NextResponse.json(
        { success: false, error: 'Rol ve departman zorunludur' },
        { status: 400 }
      )
    }

    const code = nanoid(8).toUpperCase()

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays ?? 7))

    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert({
        email: null,
        code,
        role,
        institution_id: profile.institution_id,
        department_id: departmentId,
        invited_by: profile.id,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses ?? 1,
      })
      .select('code, expires_at')
      .single()

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Davet kodu oluşturulamadı: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      code: invitation.code,
      expiresAt: invitation.expires_at,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
