import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'
import type { CreateLeaveRequestInput } from '@/lib/api/types'

// ─────────────────────────────────────────────────────────────
// POST /api/leave-requests — Yeni izin talebi oluştur
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const body: CreateLeaveRequestInput = await request.json()
    const { type, startDate, endDate, reason } = body

    // Validasyon
    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'İzin tipi, başlangıç ve bitiş tarihi zorunludur' },
        { status: 400 }
      )
    }

    const validTypes = ['annual', 'sick', 'unpaid', 'maternity', 'administrative']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz izin tipi' },
        { status: 400 }
      )
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Başlangıç tarihi bitiş tarihinden sonra olamaz' },
        { status: 400 }
      )
    }

    // Aynı tarih aralığında onaylı izin var mı kontrol et
    const { data: existingLeave } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('staff_id', profile.id)
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .limit(1)

    if (existingLeave && existingLeave.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Bu tarih aralığında zaten onaylanmış bir izniniz bulunmaktadır' },
        { status: 400 }
      )
    }

    // Insert
    const { data: leaveRequest, error: insertError } = await supabase
      .from('leave_requests')
      .insert({
        staff_id: profile.id,
        institution_id: profile.institution_id,
        type,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `İzin talebi oluşturulamadı: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Admin(lere) bildirim gönder
    // Kurumdaki institution_admin ve department_admin'leri bul
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('institution_id', profile.institution_id)
      .in('role', ['institution_admin', 'department_admin'])
      .eq('is_active', true)

    if (admins && admins.length > 0) {
      const typeLabels: Record<string, string> = {
        annual: 'Yıllık İzin',
        sick: 'Rapor',
        unpaid: 'Ücretsiz İzin',
        maternity: 'Doğum İzni',
        administrative: 'İdari İzin',
      }
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        institution_id: profile.institution_id,
        type: 'leave_request' as const,
        title: 'Yeni İzin Talebi',
        body: `${profile.full_name} ${typeLabels[type] || type} talebi oluşturdu (${startDate} - ${endDate})`,
        related_id: leaveRequest.id,
        is_read: false,
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return NextResponse.json({ success: true, leaveRequest }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/leave-requests — Kullanıcının izin taleplerini getir
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const view = searchParams.get('view')

    const isAdminView = view === 'admin' && ['institution_admin', 'department_admin'].includes(profile.role)

    let query = supabase.from('leave_requests').select(
      isAdminView ? '*, profiles!staff_id(full_name, department_id, departments(name))' : '*'
    )

    if (isAdminView) {
      query = query.eq('institution_id', profile.institution_id)
    } else {
      query = query.eq('staff_id', profile.id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data: leaveRequests, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: `İzin talepleri getirilemedi: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, leaveRequests })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
