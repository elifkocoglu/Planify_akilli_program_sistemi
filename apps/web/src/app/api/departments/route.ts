import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

// ─────────────────────────────────────────────────────────────
// GET /api/departments — Kurumun departman listesi
// ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    let query = supabase
      .from('departments')
      .select('id, name, type')
      .eq('institution_id', profile.institution_id)
      .order('name', { ascending: true })

    // department_admin ise kendi departmanlarını filtrele
    if (profile.role === 'department_admin') {
      const { data: adminDepts } = await supabase
        .from('admin_departments')
        .select('department_id')
        .eq('profile_id', profile.id)

      const deptIds = adminDepts?.map((d) => d.department_id) ?? []
      if (deptIds.length > 0) {
        query = query.in('id', deptIds)
      } else {
        return NextResponse.json({ success: true, departments: [] })
      }
    }

    const { data: departments, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: `Departmanlar getirilemedi: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, departments })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
