import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ valid: false, reason: 'Kod gerekli' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ valid: false, reason: 'Sunucu konfigürasyon hatası' }, { status: 500 })
    }

    // Doğrulama için admin client kullanılır çünkü RLS veya giriş yapmamış kullanıcı erişimi kısıtlanmış olabilir.
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 1. Kodu ara
    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .select('*, institutions(name)')
      .eq('code', code)
      .single()

    if (error || !invitation) {
      return NextResponse.json({ valid: false, reason: 'Geçersiz veya bulunamayan davet kodu' })
    }

    // 2. Kontroller
    if (!invitation.is_active) {
      return NextResponse.json({ valid: false, reason: 'Bu davet kodu artık aktif değil' })
    }

    if (new Date() > new Date(invitation.expires_at)) {
      return NextResponse.json({ valid: false, reason: 'Bu davet kodunun süresi dolmuş' })
    }

    if (invitation.use_count >= invitation.max_uses) {
      return NextResponse.json({ valid: false, reason: 'Bu davet kodu maksimum kullanım sınırına ulaştı' })
    }

    // 3. Geçerliyse bilgileri dön
    return NextResponse.json({
      valid: true,
      institution_name: invitation.institutions?.name,
      role: invitation.role,
      department_id: invitation.department_id,
      institution_id: invitation.institution_id
    })

  } catch (error: any) {
    return NextResponse.json({ valid: false, reason: error.message }, { status: 500 })
  }
}
