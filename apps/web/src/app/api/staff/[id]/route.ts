import { NextResponse } from 'next/server'
import { requireAuth, isAuthError, canAccessDepartment } from '@/lib/api/auth-helpers'
import type { UpdateStaffInput } from '@/lib/api/types'

// ─────────────────────────────────────────────────────────────
// GET /api/staff/[id] — Personel detay
// ─────────────────────────────────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    // Personel bilgisi
    const { data: staff, error: staffError } = await supabase
      .from('profiles')
      .select('id, full_name, role, institution_id, department_id, title_id, weekly_max_hours, monthly_max_shifts, is_active, created_at, departments(name), titles(name)')
      .eq('id', params.id)
      .eq('institution_id', profile.institution_id)
      .single()

    if (staffError || !staff) {
      return NextResponse.json(
        { success: false, error: 'Personel bulunamadı' },
        { status: 404 }
      )
    }

    // Departman erişim kontrolü
    if (staff.department_id) {
      const hasAccess = await canAccessDepartment(supabase, profile, staff.department_id)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Bu personele erişim yetkiniz yok' },
          { status: 403 }
        )
      }
    }

    // Bu hafta, bu ay slot istatistikleri
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1) // Pazartesi
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    // Bu haftanın slotları
    const { data: weekSlots } = await supabase
      .from('schedule_slots')
      .select('id, start_time, end_time')
      .eq('staff_id', params.id)
      .eq('status', 'active')
      .gte('date', formatDate(weekStart))
      .lte('date', formatDate(weekEnd))

    // Bu ayın slotları
    const { data: monthSlots } = await supabase
      .from('schedule_slots')
      .select('id, start_time, end_time')
      .eq('staff_id', params.id)
      .eq('status', 'active')
      .gte('date', formatDate(monthStart))
      .lte('date', formatDate(monthEnd))

    // Saat hesapla
    const calcHours = (slots: Array<{ start_time: string; end_time: string }> | null) => {
      if (!slots) return 0
      return slots.reduce((sum, s) => {
        const [sh, sm] = s.start_time.split(':').map(Number)
        const [eh, em] = s.end_time.split(':').map(Number)
        return sum + (eh * 60 + em - sh * 60 - sm) / 60
      }, 0)
    }

    // Son 3 ay bar chart verisi
    const monthlyHistory: Array<{ month: string; count: number }> = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mStart = formatDate(d)
      const mEnd = formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

      const { count } = await supabase
        .from('schedule_slots')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', params.id)
        .eq('status', 'active')
        .gte('date', mStart)
        .lte('date', mEnd)

      monthlyHistory.push({ month: monthNames[d.getMonth()], count: count ?? 0 })
    }

    // Kişiye ait kısıtlar
    const { data: constraints } = await supabase
      .from('constraints')
      .select('id, institution_id, department_id, staff_id, type, value, is_active, created_at')
      .eq('staff_id', params.id)
      .eq('is_active', true)

    // Yaklaşan slotlar (gelecek 30 gün)
    const futureEnd = new Date(now)
    futureEnd.setDate(now.getDate() + 30)
    const { data: upcomingSlots } = await supabase
      .from('schedule_slots')
      .select('id, schedule_id, staff_id, department_id, date, day_of_week, start_time, end_time, status, created_at')
      .eq('staff_id', params.id)
      .eq('status', 'active')
      .gte('date', formatDate(now))
      .lte('date', formatDate(futureEnd))
      .order('date', { ascending: true })

    // İzin talepleri
    const { data: leaveRequests } = await supabase
      .from('leave_requests')
      .select('id, type, start_date, end_date, reason, status, created_at')
      .eq('staff_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Takas talepleri
    const { data: swapRequests } = await supabase
      .from('swap_requests')
      .select('id, requester_id, receiver_id, status, created_at')
      .or(`requester_id.eq.${params.id},receiver_id.eq.${params.id}`)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      success: true,
      staff,
      slotStats: {
        thisWeek: weekSlots?.length ?? 0,
        thisMonth: monthSlots?.length ?? 0,
        thisMonthHours: Math.round(calcHours(monthSlots) * 10) / 10,
        monthlyHistory,
      },
      constraints: constraints ?? [],
      upcomingSlots: upcomingSlots ?? [],
      leaveRequests: leaveRequests ?? [],
      swapRequests: swapRequests ?? [],
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/staff/[id] — Personel güncelle
// ─────────────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const body: UpdateStaffInput = await request.json()

    // Hedef personeli çek
    const { data: targetStaff } = await supabase
      .from('profiles')
      .select('id, role, department_id, institution_id')
      .eq('id', params.id)
      .eq('institution_id', profile.institution_id)
      .single()

    if (!targetStaff) {
      return NextResponse.json(
        { success: false, error: 'Personel bulunamadı' },
        { status: 404 }
      )
    }

    // Departman erişim kontrolü
    if (targetStaff.department_id) {
      const hasAccess = await canAccessDepartment(supabase, profile, targetStaff.department_id)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Bu personele erişim yetkiniz yok' },
          { status: 403 }
        )
      }
    }

    // Rol değiştirme sadece institution_admin yapabilir
    if (body.role && profile.role !== 'institution_admin') {
      return NextResponse.json(
        { success: false, error: 'Rol değiştirme yetkisi sadece kurum yöneticisine aittir' },
        { status: 403 }
      )
    }

    // Güncelleme verisi
    const updateData: Record<string, unknown> = {}
    if (body.full_name !== undefined) updateData.full_name = body.full_name
    if (body.department_id !== undefined) updateData.department_id = body.department_id
    if (body.title_id !== undefined) updateData.title_id = body.title_id
    if (body.role !== undefined) updateData.role = body.role
    if (body.weekly_max_hours !== undefined) updateData.weekly_max_hours = body.weekly_max_hours
    if (body.monthly_max_shifts !== undefined) updateData.monthly_max_shifts = body.monthly_max_shifts
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Güncellenecek alan bulunamadı' },
        { status: 400 }
      )
    }

    const { data: updatedStaff, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', params.id)
      .select('id, full_name, role, institution_id, department_id, title_id, weekly_max_hours, monthly_max_shifts, is_active, created_at, departments(name), titles(name)')
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
      table_name: 'profiles',
      record_id: params.id,
      new_value: updateData,
    })

    return NextResponse.json({ success: true, staff: updatedStaff })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
