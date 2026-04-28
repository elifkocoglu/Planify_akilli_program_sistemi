import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'
import type { CreateScheduleInput } from '@/lib/api/types'

// ─────────────────────────────────────────────────────────────
// POST /api/schedules — Yeni taslak schedule oluştur
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    // 1. Auth + rol kontrolü
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    // 2. Body doğrula
    const body: CreateScheduleInput = await request.json()
    const { title, type, periodType, departmentId, startDate, endDate } = body

    if (!title || !type || !periodType || !departmentId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Tüm alanlar zorunludur: title, type, periodType, departmentId, startDate, endDate' },
        { status: 400 }
      )
    }

    if (!['duty', 'lesson'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz program tipi. "duty" veya "lesson" olmalı' },
        { status: 400 }
      )
    }

    if (!['weekly', 'monthly'].includes(periodType)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz periyot tipi. "weekly" veya "monthly" olmalı' },
        { status: 400 }
      )
    }

    // 3. Tarih kontrolü
    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Başlangıç tarihi bitiş tarihinden önce olmalıdır' },
        { status: 400 }
      )
    }

    // 4. department_admin ise departman erişim kontrolü
    if (profile.role === 'department_admin') {
      const { data: adminDept } = await supabase
        .from('admin_departments')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('department_id', departmentId)
        .single()

      if (!adminDept) {
        return NextResponse.json(
          { success: false, error: 'Bu departmana erişim yetkiniz bulunmuyor' },
          { status: 403 }
        )
      }
    }

    // 5. Schedule oluştur
    const { data: schedule, error: insertError } = await supabase
      .from('schedules')
      .insert({
        title,
        type,
        period_type: periodType,
        department_id: departmentId,
        start_date: startDate,
        end_date: endDate,
        status: 'draft',
        created_by: profile.id,
        institution_id: profile.institution_id,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Program oluşturulamadı: ${insertError.message}` },
        { status: 500 }
      )
    }

    // 6. Audit log
    await supabase.from('audit_logs').insert({
      institution_id: profile.institution_id,
      user_id: profile.id,
      action: 'created',
      table_name: 'schedules',
      record_id: schedule.id,
      new_value: { title, type, periodType, departmentId, startDate, endDate },
    })

    return NextResponse.json({ success: true, schedule }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/schedules — Schedule listesi
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    // 1. Auth kontrolü
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    // 2. Query parametreleri
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status')

    // 3. Sorgu oluştur
    let query = supabase
      .from('schedules')
      .select('*, departments(name)')
      .eq('institution_id', profile.institution_id)
      .order('created_at', { ascending: false })

    // 4. Role göre filtreleme
    if (profile.role === 'staff') {
      // Staff sadece published programları görebilir
      query = query.eq('status', 'published')
    } else if (profile.role === 'department_admin') {
      // department_admin sadece kendi departmanlarını görür
      const { data: adminDepts } = await supabase
        .from('admin_departments')
        .select('department_id')
        .eq('profile_id', profile.id)

      const deptIds = adminDepts?.map((d) => d.department_id) ?? []
      if (deptIds.length > 0) {
        query = query.in('department_id', deptIds)
      } else {
        // Hiç departmanı yoksa boş dön
        return NextResponse.json({ success: true, schedules: [] })
      }
    }
    // institution_admin → tüm kurum, ek filtre gerekmiyor

    // 5. Opsiyonel filtreler
    if (departmentId) {
      query = query.eq('department_id', departmentId)
    }
    if (status && profile.role !== 'staff') {
      // staff zaten published ile sınırlı
      query = query.eq('status', status)
    }

    const { data: schedules, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: `Programlar getirilemedi: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, schedules })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
