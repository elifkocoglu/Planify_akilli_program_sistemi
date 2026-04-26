'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function registerAction(formData: FormData): Promise<never> {
  const fullName = formData.get('full_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  // Şifre eşleşme kontrolü
  if (password !== confirmPassword) {
    redirect('/register?error=Sifreler+eslesmiyor')
  }

  // Şifre uzunluğu kontrolü
  if (password.length < 6) {
    redirect('/register?error=Sifre+en+az+6+karakter+olmali')
  }

  const supabase = createClient()

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'staff',
        },
      },
    })

    if (error) {
      if (
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists') ||
        error.message.toLowerCase().includes('user already')
      ) {
        redirect('/register?error=Bu+eposta+zaten+kayitli')
      }
      redirect('/register?error=Kayit+sirasinda+hata+olustu')
    }
  } catch (err) {
    throw err
  }

  redirect('/register?success=1')
}
