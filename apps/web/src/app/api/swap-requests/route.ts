import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

// ─────────────────────────────────────────────────────────────
// GET /api/swap-requests — Takas taleplerini listele
// Query params:
//   ?status=approved_by_receiver   → Admin onayı bekleyenler
//   ?mine=true                     → Auth kullanıcının taleplerini getir
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const mine = searchParams.get('mine') === 'true'

    let query = supabase
      .from('swap_requests')
      .select(`
        id, status, created_at, reject_reason,
        requester_id, receiver_id,
        requester:profiles!swap_requests_requester_id_fkey(id, full_name),
        receiver:profiles!swap_requests_receiver_id_fkey(id, full_name),
        requester_slot:schedule_slots!swap_requests_requester_slot_id_fkey(
          id, date, start_time, end_time, department_id,
          departments(name)
        ),
        receiver_slot:schedule_slots!swap_requests_receiver_slot_id_fkey(
          id, date, start_time, end_time, department_id,
          departments(name)
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (mine) {
      // Kullanıcı requester veya receiver olduğu talepler
      query = query.or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
    } else if (!status) {
      // Hiçbir filtre yoksa kuruma ait tüm talepler (admin için)
      // institution_id bazlı filtreleme yapılmıyor çünkü RLS bunu yönetiyor
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, swapRequests: data ?? [] })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/swap-requests — Yeni takas talebi oluştur
// Body: { requesterSlotId, receiverSlotId, receiverId }
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const body = await request.json()
    const { requesterSlotId, receiverSlotId, receiverId } = body as {
      requesterSlotId?: string
      receiverSlotId?: string
      receiverId?: string
    }

    if (!requesterSlotId || !receiverSlotId || !receiverId) {
      return NextResponse.json(
        { success: false, error: 'requesterSlotId, receiverSlotId ve receiverId zorunludur' },
        { status: 400 }
      )
    }

    // Aynı slot için bekleyen talep var mı kontrol et
    const { data: existing } = await supabase
      .from('swap_requests')
      .select('id')
      .eq('requester_slot_id', requesterSlotId)
      .in('status', ['pending', 'approved_by_receiver'])
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Bu nöbet için zaten bekleyen bir takas talebi var' },
        { status: 400 }
      )
    }

    // Talebi oluştur
    const { data: swapRequest, error: insertError } = await supabase
      .from('swap_requests')
      .insert({
        requester_id: profile.id,
        receiver_id: receiverId,
        requester_slot_id: requesterSlotId,
        receiver_slot_id: receiverSlotId,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Takas talebi oluşturulamadı: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Alıcıya bildirim gönder
    await supabase.from('notifications').insert({
      user_id: receiverId,
      institution_id: profile.institution_id,
      type: 'swap_request',
      title: 'Yeni Takas Talebi',
      body: `${profile.full_name} size bir takas talebi gönderdi.`,
      related_id: swapRequest.id,
      is_read: false,
    })

    // Push bildirim (sessizce)
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userIds: [receiverId],
          title: 'Yeni Takas Talebi 🔄',
          body: `${profile.full_name} size bir takas talebi gönderdi.`,
          data: { screen: '/(tabs)/requests' },
        },
      })
    } catch { /* sessiz */ }

    return NextResponse.json({ success: true, swapRequest }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

