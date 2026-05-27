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
