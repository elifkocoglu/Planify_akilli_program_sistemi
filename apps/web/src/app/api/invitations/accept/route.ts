import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { code, full_name, password } = await request.json()

    if (!code || !full_name || !password) {
      return NextResponse.json({ success: false, error: 'Eksik parametreler' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Sunucu konfigürasyon hatası' }, { status: 500 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 1. Kodu doğrula
    const { data: invitation, error: invError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('code', code)
      .single()

    if (invError || !invitation) {
      return NextResponse.json({ success: false, error: 'Geçersiz veya bulunamayan davet kodu' }, { status: 400 })
    }

    if (!invitation.is_active || new Date() > new Date(invitation.expires_at) || invitation.use_count >= invitation.max_uses) {
      return NextResponse.json({ success: false, error: 'Bu davet kodu geçersiz veya süresi dolmuş' }, { status: 400 })
    }

    // 2. signUp ile kullanıcı oluştur
    const supabase = createClient()
    // Admin ile oluşturmak daha garantidir (kullanıcı zaten oluşturulduysa, signUp hata verir)
    
    let createdUserId: string;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation.email, // Davetteki email adresine göre
      password,
      options: {
        data: {
          full_name,
          role: invitation.role,
        }
      }
    })

    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: authError?.message || 'Bilinmeyen auth hatası' }, { status: 500 })
    }

    createdUserId = authData.user.id

    // signUp trigger'ı profile oluşturmuş olabilir ya da hemen oluşturacaktır.
    // 3. profiles tablosunu güncelle 
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        institution_id: invitation.institution_id,
        department_id: invitation.department_id,
        role: invitation.role,
        full_name: full_name, // trigger overwrite'a karşı
        is_active: true
      })
      .eq('id', createdUserId)

    if (profileError) {
      // Profil güncellenemezse bile hesabı oluşturuldu, ama uyarı dönelim
      console.error('Profil güncelleme hatası', profileError)
    }

    // 4. invitations tablosunu güncelle
    const newUseCount = invitation.use_count + 1
    const isNowInactive = newUseCount >= invitation.max_uses

    await supabaseAdmin
      .from('invitations')
      .update({
        use_count: newUseCount,
        is_active: !isNowInactive
      })
      .eq('id', invitation.id)

    // Başarılıysa session açık olarak devam edilecek, client side yönlendirme yapabiliriz.
    return NextResponse.json({ success: true, message: 'Kayıt başarılı.' })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
