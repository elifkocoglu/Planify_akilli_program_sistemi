import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { code, full_name, email, password, userId } = await request.json()

    if (!code) {
      return NextResponse.json({ success: false, error: 'Davet kodu zorunludur' }, { status: 400 })
    }

    if (!userId && (!full_name || !email || !password)) {
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

    // 2. signUp ile kullanıcı oluştur veya mevcut kullanıcıyı kullan
    const supabase = createClient()
    
    let createdUserId = userId;

    if (!createdUserId) {
      console.log('Gönderilen email:', email)
      console.log('Full name:', full_name)
      console.log('Email boş mu:', !email || email.trim() === '')

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password,
        options: {
          data: {
            full_name,
            role: invitation.role,
          }
        }
      })

      if (authError || !authData.user) {
        console.error('Supabase auth hatası:', authError)
        console.error('Hata kodu:', authError?.status)
        console.error('Hata mesajı:', authError?.message)
        
        let errorMessage = authError?.message || 'Bilinmeyen auth hatası'
        
        if (errorMessage.includes('already registered') || errorMessage.includes('already been registered')) {
          errorMessage = 'Bu e-posta zaten kayıtlı'
        } else if (errorMessage.includes('Anonymous sign-ins are disabled')) {
          errorMessage = 'E-posta ve şifre boş gönderilemez'
        } else if (errorMessage.includes('Password should be')) {
          errorMessage = 'Şifre en az 6 karakter olmalı'
        } else if (errorMessage.includes('invalid')) {
          errorMessage = 'Geçerli bir e-posta adresi girin'
        }

        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
      }

      createdUserId = authData.user.id
    } else {
      // Güvenlik: userId gerçekten login olan kişiye mi ait?
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser || currentUser.id !== userId) {
        return NextResponse.json({ success: false, error: 'Yetkisiz işlem' }, { status: 401 })
      }
    }

    // signUp trigger'ı profile oluşturmuş olabilir ya da hemen oluşturacaktır.
    // 3. profiles tablosunu güncelle 
    const updateData: Record<string, unknown> = {
      institution_id: invitation.institution_id,
      department_id: invitation.department_id,
      role: invitation.role,
      is_active: true
    }
    
    if (full_name) {
      updateData.full_name = full_name
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
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

  } catch (error: unknown) {
    console.error('Beklenmeyen hata:', error)
    const err = error as Error
    return NextResponse.json({ success: false, error: 'Hata: ' + String(err) }, { status: 500 })
  }
}
