import { NextResponse } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

// ─────────────────────────────────────────────────────────────
// GET /api/titles — Kurum unvan listesi
// ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const { data: titles, error } = await supabase
      .from('titles')
      .select('id, institution_id, name, min_required_per_shift, created_at')
      .eq('institution_id', profile.institution_id)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json(
        { success: false, error: `Unvanlar alınamadı: ${error.message}` },
        { status: 500 }
      )
    }

    // Her unvan için personel sayısı
    const titleIds = titles?.map((t) => t.id) ?? []
    let staffCounts: Record<string, number> = {}

    if (titleIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('title_id')
        .in('title_id', titleIds)
        .eq('is_active', true)

      if (profiles) {
        staffCounts = profiles.reduce((acc: Record<string, number>, p) => {
          if (p.title_id) {
            acc[p.title_id] = (acc[p.title_id] ?? 0) + 1
          }
          return acc
        }, {})
      }
    }

    const titlesWithCounts = (titles ?? []).map((t) => ({
      ...t,
      staff_count: staffCounts[t.id] ?? 0,
    }))

    return NextResponse.json({ success: true, titles: titlesWithCounts })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/titles — Yeni unvan oluştur
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(['institution_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    const body = await request.json()
    const { name, minRequiredPerShift } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Unvan adı zorunludur' },
        { status: 400 }
      )
    }

    const { data: title, error: insertError } = await supabase
      .from('titles')
      .insert({
        institution_id: profile.institution_id,
        name,
        min_required_per_shift: minRequiredPerShift ?? 0,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Unvan oluşturulamadı: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, title })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
