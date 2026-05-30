import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

// ─────────────────────────────────────────────────────────────
// PATCH /api/leave-requests/[id] — İzin talebini güncelle
// Staff: iptal | Admin: onay/red | Admin: iptal talebi onayla/reddet
// ─────────────────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { id } = params
    const body = await request.json()
    const { action, reviewerNote, cancel_requested, cancel_reason } = body as {
      action?: 'cancel' | 'approve' | 'reject' | 'approve_cancel_request' | 'reject_cancel_request'
      reviewerNote?: string
      cancel_requested?: boolean
      cancel_reason?: string
    }

    // Staff: onaylanan izni iptal talebi gönder (cancel_requested)
    if (typeof cancel_requested === 'boolean') {
      const { data: leaveRequest, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !leaveRequest) {
        return NextResponse.json({ success: false, error: 'İzin talebi bulunamadı' }, { status: 404 })
      }

      if (leaveRequest.staff_id !== profile.id) {
        return NextResponse.json({ success: false, error: 'Sadece kendi talebiniz için işlem yapabilirsiniz' }, { status: 403 })
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ cancel_requested, cancel_reason: cancel_reason || null })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ success: false, error: `İşlem başarısız: ${updateError.message}` }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'İşlem tipi belirtilmelidir (action)' },
        { status: 400 }
      )
    }

    // Mevcut talebi çek
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { success: false, error: 'İzin talebi bulunamadı' },
        { status: 404 }
      )
    }

    // Staff kendi talebini iptal ediyor
    if (action === 'cancel') {
      if (leaveRequest.staff_id !== profile.id) {
        return NextResponse.json(
          { success: false, error: 'Sadece kendi talebinizi iptal edebilirsiniz' },
          { status: 403 }
        )
      }

      if (leaveRequest.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Sadece bekleyen talepler iptal edilebilir' },
          { status: 400 }
        )
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled', reviewer_note: 'Personel tarafından iptal edildi' })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json(
          { success: false, error: `İptal işlemi başarısız: ${updateError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    // Admin onay/red işlemi
    if (action === 'approve' || action === 'reject') {
      const allowedRoles = ['institution_admin', 'department_admin']
      if (!allowedRoles.includes(profile.role)) {
        return NextResponse.json(
          { success: false, error: 'Bu işlem için yetkiniz bulunmuyor' },
          { status: 403 }
        )
      }

      if (leaveRequest.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Sadece bekleyen talepler onaylanabilir/reddedilebilir' },
          { status: 400 }
        )
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected'

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status: newStatus,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
          reviewer_note: reviewerNote || null,
        })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json(
          { success: false, error: `İşlem başarısız: ${updateError.message}` },
          { status: 500 }
        )
      }

      // Personele bildirim gönder
      const notificationType = action === 'approve' ? 'leave_approved' : 'leave_rejected'
      const notificationTitle = action === 'approve' ? 'İzin Talebiniz Onaylandı' : 'İzin Talebiniz Reddedildi'
      const notificationBody = action === 'approve'
        ? `${leaveRequest.start_date} - ${leaveRequest.end_date} tarihleri arasındaki izin talebiniz onaylandı.`
        : `${leaveRequest.start_date} - ${leaveRequest.end_date} tarihleri arasındaki izin talebiniz reddedildi.${reviewerNote ? ` Sebep: ${reviewerNote}` : ''}`

      await supabase.from('notifications').insert({
        user_id: leaveRequest.staff_id,
        institution_id: leaveRequest.institution_id,
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        related_id: id,
        is_read: false,
      })

      // Push bildirim gönder (sessizce, hata olursa engelleme)
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userIds: [leaveRequest.staff_id],
            title: notificationTitle,
            body: notificationBody,
            data: { screen: '/(tabs)/requests' },
          },
        })
      } catch {
        // Push gönderilemese de işlem başarılı sayılır
      }

      return NextResponse.json({ success: true })
    }

    // Admin: İptal talebini onayla
    if (action === 'approve_cancel_request') {
      const allowedRoles = ['institution_admin', 'department_admin']
      if (!allowedRoles.includes(profile.role)) {
        return NextResponse.json({ success: false, error: 'Bu işlem için yetkiniz bulunmuyor' }, { status: 403 })
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled', cancel_requested: false, reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ success: false, error: `İşlem başarısız: ${updateError.message}` }, { status: 500 })
      }

      // Personele bildirim gönder
      await supabase.from('notifications').insert({
        user_id: leaveRequest.staff_id,
        institution_id: leaveRequest.institution_id,
        type: 'leave_cancel_approved',
        title: 'İzin İptal Talebiniz Onaylandı',
        body: `${leaveRequest.start_date} - ${leaveRequest.end_date} tarihleri arasındaki izninizin iptal talebi onaylandı.`,
        related_id: id,
        is_read: false,
      })

      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userIds: [leaveRequest.staff_id],
            title: 'İzin İptal Talebiniz Onaylandı',
            body: 'İzin iptal talebiniz onaylandı.',
            data: { screen: '/(tabs)/requests' },
          },
        })
      } catch { /* sessiz */ }

      return NextResponse.json({ success: true })
    }

    // Admin: İptal talebini reddet
    if (action === 'reject_cancel_request') {
      const allowedRoles = ['institution_admin', 'department_admin']
      if (!allowedRoles.includes(profile.role)) {
        return NextResponse.json({ success: false, error: 'Bu işlem için yetkiniz bulunmuyor' }, { status: 403 })
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ cancel_requested: false, cancel_reason: null })
        .eq('id', id)

      if (updateError) {
        return NextResponse.json({ success: false, error: `İşlem başarısız: ${updateError.message}` }, { status: 500 })
      }

      // Personele bildirim gönder
      await supabase.from('notifications').insert({
        user_id: leaveRequest.staff_id,
        institution_id: leaveRequest.institution_id,
        type: 'leave_cancel_rejected',
        title: 'İzin İptal Talebiniz Reddedildi',
        body: `${leaveRequest.start_date} - ${leaveRequest.end_date} tarihleri arasındaki izninizin iptal talebi reddedildi.`,
        related_id: id,
        is_read: false,
      })

      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userIds: [leaveRequest.staff_id],
            title: 'İzin İptal Talebiniz Reddedildi',
            body: 'İzin iptal talebiniz reddedildi.',
            data: { screen: '/(tabs)/requests' },
          },
        })
      } catch { /* sessiz */ }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: 'Geçersiz işlem tipi' },
      { status: 400 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

