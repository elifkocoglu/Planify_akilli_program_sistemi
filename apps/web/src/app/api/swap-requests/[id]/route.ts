import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

// ─────────────────────────────────────────────────────────────
// PATCH /api/swap-requests/[id] — Takas talebine yanıt ver
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
    const { action, rejectReason } = body as {
      action: 'accept' | 'reject' | 'approve'
      rejectReason?: string
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'İşlem tipi belirtilmelidir' },
        { status: 400 }
      )
    }

    // Talebi çek
    const { data: swap, error: fetchError } = await supabase
      .from('swap_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !swap) {
      return NextResponse.json(
        { success: false, error: 'Takas talebi bulunamadı' },
        { status: 404 }
      )
    }

    // RECEIVER KABUL
    if (action === 'accept') {
      if (swap.receiver_id !== profile.id) {
        return NextResponse.json(
          { success: false, error: 'Bu talebi sadece alıcı kabul edebilir' },
          { status: 403 }
        )
      }
      if (swap.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Bu talep artık beklemede değil' },
          { status: 400 }
        )
      }

      const { error: upErr } = await supabase
        .from('swap_requests')
        .update({ status: 'approved_by_receiver' })
        .eq('id', id)

      if (upErr) {
        return NextResponse.json(
          { success: false, error: upErr.message },
          { status: 500 }
        )
      }

      // Admin bildirim
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('institution_id', profile.institution_id)
        .in('role', ['institution_admin', 'department_admin'])
        .eq('is_active', true)

      if (admins && admins.length > 0) {
        await supabase.from('notifications').insert(
          admins.map((a) => ({
            user_id: a.id,
            type: 'swap_request' as const,
            title: 'Takas Talebi Admin Onayı Bekliyor',
            body: `Bir takas talebi her iki tarafça kabul edildi, admin onayınız bekleniyor.`,
            related_id: id,
            is_read: false,
          }))
        )
      }

      // Requester'a bildirim
      await supabase.from('notifications').insert({
        user_id: swap.requester_id,
        type: 'swap_request',
        title: 'Takas Talebiniz Kabul Edildi',
        body: 'Karşı taraf takas talebinizi kabul etti. Admin onayı bekleniyor.',
        related_id: id,
        is_read: false,
      })

      // Push bildirim (sessizce)
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userIds: [swap.requester_id],
            title: 'Takas Talebiniz Kabul Edildi 🔄',
            body: 'Karşı taraf takas teklifinizi kabul etti. Admin onayı bekleniyor.',
            data: { screen: '/(tabs)/requests' },
          },
        })
      } catch { /* sessiz */ }

      return NextResponse.json({ success: true })
    }

    // RED (receiver veya admin)
    if (action === 'reject') {
      const isReceiver = swap.receiver_id === profile.id
      const isAdmin = ['institution_admin', 'department_admin'].includes(profile.role)

      if (!isReceiver && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Bu işlem için yetkiniz yok' },
          { status: 403 }
        )
      }

      const { error: upErr } = await supabase
        .from('swap_requests')
        .update({ status: 'rejected', reject_reason: rejectReason || null })
        .eq('id', id)

      if (upErr) {
        return NextResponse.json(
          { success: false, error: upErr.message },
          { status: 500 }
        )
      }

      // İlgili kişilere bildirim
      const notifyIds = [swap.requester_id]
      if (!isReceiver) notifyIds.push(swap.receiver_id)

      const rejectBody = rejectReason
        ? `Takas talebiniz reddedildi. Sebep: ${rejectReason}`
        : 'Takas talebiniz reddedildi.'

      await supabase.from('notifications').insert(
        notifyIds.map((uid) => ({
          user_id: uid,
          type: 'swap_rejected' as const,
          title: 'Takas Talebi Reddedildi',
          body: rejectBody,
          related_id: id,
          is_read: false,
        }))
      )

      // Push bildirim (sessizce)
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userIds: notifyIds,
            title: 'Takas Talebi Reddedildi ❌',
            body: rejectBody,
            data: { screen: '/(tabs)/requests' },
          },
        })
      } catch { /* sessiz */ }

      return NextResponse.json({ success: true })
    }

    // ADMIN ONAY
    if (action === 'approve') {
      if (!['institution_admin', 'department_admin'].includes(profile.role)) {
        return NextResponse.json(
          { success: false, error: 'Admin onayı yetkiniz yok' },
          { status: 403 }
        )
      }
      if (swap.status !== 'approved_by_receiver') {
        return NextResponse.json(
          { success: false, error: 'Bu talep henüz alıcı tarafından onaylanmamış' },
          { status: 400 }
        )
      }

      // Slot staff_id'lerini swap et
      const { error: e1 } = await supabase
        .from('schedule_slots')
        .update({ staff_id: swap.receiver_id, status: 'swapped' })
        .eq('id', swap.requester_slot_id)

      const { error: e2 } = await supabase
        .from('schedule_slots')
        .update({ staff_id: swap.requester_id, status: 'swapped' })
        .eq('id', swap.receiver_slot_id)

      if (e1 || e2) {
        return NextResponse.json(
          { success: false, error: 'Slot güncelleme hatası' },
          { status: 500 }
        )
      }

      const { error: upErr } = await supabase
        .from('swap_requests')
        .update({ status: 'approved_by_admin' })
        .eq('id', id)

      if (upErr) {
        return NextResponse.json(
          { success: false, error: upErr.message },
          { status: 500 }
        )
      }

      // Her iki personele bildirim
      await supabase.from('notifications').insert([
        {
          user_id: swap.requester_id,
          type: 'swap_approved' as const,
          title: 'Takas Onaylandı',
          body: 'Takas talebiniz admin tarafından onaylandı. Nöbetleriniz güncellendi.',
          related_id: id,
          is_read: false,
        },
        {
          user_id: swap.receiver_id,
          type: 'swap_approved' as const,
          title: 'Takas Onaylandı',
          body: 'Takas talebi admin tarafından onaylandı. Nöbetleriniz güncellendi.',
          related_id: id,
          is_read: false,
        },
      ])

      // Push bildirim (sessizce)
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userIds: [swap.requester_id, swap.receiver_id],
            title: 'Takas Onaylandı ✅',
            body: 'Takas talebiniz admin tarafından onaylandı. Nöbetleriniz güncellendi.',
            data: { screen: '/(tabs)/requests' },
          },
        })
      } catch { /* sessiz */ }

      // Audit log
      await supabase.from('audit_logs').insert({
        institution_id: profile.institution_id,
        user_id: profile.id,
        action: 'swap_approved',
        table_name: 'swap_requests',
        record_id: id,
        new_value: {
          requester_id: swap.requester_id,
          receiver_id: swap.receiver_id,
          requester_slot_id: swap.requester_slot_id,
          receiver_slot_id: swap.receiver_slot_id,
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, error: 'Geçersiz işlem' },
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
