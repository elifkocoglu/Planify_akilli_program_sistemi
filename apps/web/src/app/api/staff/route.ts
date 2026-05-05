import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

// ─────────────────────────────────────────────────────────────
// GET /api/staff — Kurum personel listesi
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const role = searchParams.get('role')
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')

    // Ana sorgu
    let query = supabase
      .from('profiles')
      .select('id, full_name, role, institution_id, department_id, title_id, weekly_max_hours, monthly_max_shifts, is_active, created_at, departments(name), titles(name)')
      .eq('institution_id', profile.institution_id)
      .order('full_name', { ascending: true })

    // department_admin ise sadece kendi departmanındaki personeli görsün
    if (profile.role === 'department_admin') {
      const { data: adminDepts } = await supabase
        .from('admin_departments')
        .select('department_id')
        .eq('profile_id', profile.id)

      const deptIds = adminDepts?.map((d) => d.department_id) ?? []
      if (deptIds.length > 0) {
        query = query.in('department_id', deptIds)
      } else {
        return NextResponse.json({ success: true, staff: [] })
      }
    }

    // Filtreler
    if (departmentId) {
      query = query.eq('department_id', departmentId)
    }
    if (role && role !== 'all') {
      query = query.eq('role', role)
    }
    if (isActive === 'true') {
      query = query.eq('is_active', true)
    } else if (isActive === 'false') {
      query = query.eq('is_active', false)
    }
    if (search) {
      query = query.ilike('full_name', `%${search}%`)
    }

    const { data: staffList, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: `Personel listesi alınamadı: ${error.message}` },
        { status: 500 }
      )
    }

    // Bu ayki slot sayılarını çek
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const staffIds = staffList?.map((s) => s.id) ?? []
    let slotCounts: Record<string, number> = {}

    if (staffIds.length > 0) {
      const { data: slots } = await supabase
        .from('schedule_slots')
        .select('staff_id')
        .in('staff_id', staffIds)
        .eq('status', 'active')
        .gte('date', monthStart)
        .lte('date', monthEnd)

      if (slots) {
        slotCounts = slots.reduce((acc: Record<string, number>, slot) => {
          acc[slot.staff_id] = (acc[slot.staff_id] ?? 0) + 1
          return acc
        }, {})
      }
    }

    const staff = (staffList ?? []).map((s) => ({
      ...s,
      slot_count: slotCounts[s.id] ?? 0,
    }))

    return NextResponse.json({ success: true, staff })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
