import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface RegisterPageProps {
  searchParams: { error?: string; success?: string }
}

export const metadata = {
  title: 'Kayıt Ol — Planify',
  description: 'Planify hesabı oluşturun.',
}

async function registerAction(formData: FormData): Promise<never> {
  'use server'
  const fullName = formData.get('full_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  // Şifre eşleşme kontrolü
  if (password !== confirmPassword) {
    redirect('/register?error=Sifreler+eslesmıyor')
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

function getErrorMessage(error?: string): string | null {
  if (!error) return null
  const decoded = decodeURIComponent(error.replace(/\+/g, ' '))
  if (decoded.includes('eslesmıyor') || decoded.includes('eslesmıyor'))
    return 'Şifreler eşleşmiyor.'
  if (decoded.includes('6 karakter')) return 'Şifre en az 6 karakter olmalı.'
  if (decoded.includes('kayitli')) return 'Bu e-posta zaten kayıtlı.'
  return decoded
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const errorMessage = getErrorMessage(searchParams.error)
  const isSuccess = searchParams.success === '1'

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
      <CardHeader className="space-y-1 pb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center text-white">
          Hesap Oluştur
        </CardTitle>
        <CardDescription className="text-center text-blue-100/60">
          Planify&apos;a katılın
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
            <h3 className="text-lg font-semibold text-white">
              E-postanızı Doğrulayın
            </h3>
            <p className="text-sm text-blue-100/60 leading-relaxed">
              Kayıt işleminiz tamamlandı. Hesabınızı etkinleştirmek için
              e-posta adresinize gönderilen doğrulama bağlantısına tıklayın.
            </p>
            <Link
              href="/login"
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Giriş sayfasına dön →
            </Link>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <form action={registerAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-blue-100/80 text-sm">
                  Ad Soyad
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="Adınız Soyadınız"
                  required
                  autoComplete="name"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-blue-100/80 text-sm">
                  E-posta
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ornek@kurum.edu.tr"
                  required
                  autoComplete="email"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-blue-100/80 text-sm">
                  Şifre
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="En az 6 karakter"
                  required
                  autoComplete="new-password"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-blue-100/80 text-sm">
                  Şifre Tekrar
                </Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  placeholder="Şifrenizi tekrar girin"
                  required
                  autoComplete="new-password"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-200"
                id="register-submit-btn"
              >
                Kayıt Ol
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-blue-100/50">
              Zaten hesabınız var mı?{' '}
              <Link
                href="/login"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Giriş yapın
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
