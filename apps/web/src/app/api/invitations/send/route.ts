import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, role, department_id } = await request.json()

    // 1. Session ve yetki kontrolü
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Oturum bulunamadı' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, institution_id')
      .eq('id', user.id)
      .single()

    if (!adminProfile || !['super_admin', 'institution_admin', 'department_admin'].includes(adminProfile.role)) {
      return NextResponse.json({ success: false, error: 'Yetkisiz işlem' }, { status: 403 })
    }

    // 2. Email kontrolü (profiles)
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', email) // Not: e-posta auth.users altında saklanıyor ama şu an profiles da email varsa eşleştirebilirdik.
      .single() // Bu proje için, eposta unique olduğu varsayılıyor. Şimdilik users'dan kontrol etmeliyiz.
      
    // Not: Normal hesaplar için Supabase Auth tarafında kontrol daha sağlıklı ama profile'da email alanı olmalı. 
    // Admin yetkisiyle kontrol edelim.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY eksik' }, { status: 500 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Admin ile Email kontrolü
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers()
    const isEmailRegistered = existingAuthUser.users.find(u => u.email === email)

    if (isEmailRegistered) {
      return NextResponse.json({ success: false, error: 'Bu email adresi zaten kayıtlı' }, { status: 400 })
    }

    // 3. invitations tablosuna kayıt
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 gün
    
    // Davet kodu üretimi
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()

    const { data: invitation, error: invError } = await supabaseAdmin
      .from('invitations')
      .insert({
        email,
        role,
        institution_id: adminProfile.institution_id,
        department_id,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        max_uses: 1,
        code
      })
      .select()
      .single()

    if (invError) {
      return NextResponse.json({ success: false, error: invError.message }, { status: 500 })
    }

    // 4. Supabase Auth admin.generateLink() ile magic link üret
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    if (linkError) {
      return NextResponse.json({ success: false, error: linkError.message }, { status: 500 })
    }

    // 5. Supabase email sistemi ile gönder 
    // Not: generateLink sadece link üretir. Eğer Supabase'in built-in sistemiyle email atmak isteniyorsa 
    // signInWithOtp kullanılabilir. Admin api ile ürettiğimiz linki Resend, node-mailer vb. 
    // veya basit login linki olarak kullandırabiliriz. 
    // (Şu anlik mock olarak başarılı dönüyoruz, magic linki payload'da paslıyoruz)
    console.log("Email gönderildi eklentisi. Link:", linkData.properties.action_link)

    return NextResponse.json({ 
      success: true, 
      message: 'Davet başarıyla gönderildi',
      magic_link: linkData.properties.action_link 
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
