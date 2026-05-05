import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'
import type { CreateConstraintInput } from '@/lib/api/types'

// ─────────────────────────────────────────────────────────────
// GET /api/constraints — Kurum kısıt listesi
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const staffId = searchParams.get('staffId')
    const departmentId = searchParams.get('departmentId')
    const isActive = searchParams.get('isActive')

    let query = supabase
      .from('constraints')
      .select('id, institution_id, department_id, staff_id, type, value, is_active, created_at, profiles(full_name), departments(name)')
      .eq('institution_id', profile.institution_id)
      .order('created_at', { ascending: false })

    // department_admin kendi departmanlarını görsün
    if (profile.role === 'department_admin') {
      const { data: adminDepts } = await supabase
        .from('admin_departments')
        .select('department_id')
        .eq('profile_id', profile.id)

      const deptIds = adminDepts?.map((d) => d.department_id) ?? []
      if (deptIds.length > 0) {
        // departman bazlı veya tüm kurum kısıtlarını göster
        query = query.or(`department_id.in.(${deptIds.join(',')}),department_id.is.null`)
      }
    }

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    if (staffId) {
      query = query.eq('staff_id', staffId)
    }
    if (departmentId) {
      query = query.eq('department_id', departmentId)
    }
    if (isActive === 'true') {
      query = query.eq('is_active', true)
    } else if (isActive === 'false') {
      query = query.eq('is_active', false)
    }

    const { data: constraints, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: `Kısıtlar alınamadı: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, constraints })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/constraints — Yeni kısıt ekle
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const body: CreateConstraintInput = await request.json()
    const { type, value, departmentId, staffId } = body

    if (!type || !value) {
      return NextResponse.json(
        { success: false, error: 'Kısıt tipi ve değeri zorunludur' },
        { status: 400 }
      )
    }

    const { data: constraint, error: insertError } = await supabase
      .from('constraints')
      .insert({
        institution_id: profile.institution_id,
        department_id: departmentId ?? null,
        staff_id: staffId ?? null,
        type,
        value,
        is_active: true,
      })
      .select('id, institution_id, department_id, staff_id, type, value, is_active, created_at')
      .single()

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Kısıt eklenemedi: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: profile.institution_id,
      user_id: profile.id,
      action: 'created',
      table_name: 'constraints',
      record_id: constraint.id,
      new_value: { type, value, departmentId, staffId },
    })

    return NextResponse.json({ success: true, constraint })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
