import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRedirectPath } from '@/lib/auth/getRedirectPath'
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
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface LoginPageProps {
  searchParams: { error?: string; reason?: string }
}

export const metadata = {
  title: 'Giriş Yap — Planify',
  description: 'Planify hesabınıza giriş yapın.',
}

async function loginAction(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (
      error.message.toLowerCase().includes('invalid') ||
      error.message.toLowerCase().includes('credentials')
    ) {
      redirect('/login?error=Eposta+veya+sifre+hatali')
    }
    redirect('/login?error=Giris+basarisiz+oldu')
  }

  if (!data.user) {
    redirect('/login?error=Bilinmeyen+bir+hata+olustu')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .single()

  if (profile?.is_active === false) {
    await supabase.auth.signOut()
    redirect('/login?reason=disabled')
  }

  const path = getRedirectPath(profile?.role ?? 'staff')

  // redirect() MUST be outside try/catch — it throws an exception internally
  redirect(path)
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  let errorMessage: string | null = null

  if (searchParams.reason === 'disabled') {
    errorMessage =
      'Hesabınız devre dışı bırakılmıştır. Lütfen yöneticinizle iletişime geçin.'
  } else if (searchParams.error) {
    const decoded = decodeURIComponent(searchParams.error.replace(/\+/g, ' '))
    if (decoded.includes('hatali')) errorMessage = 'E-posta veya şifre hatalı.'
    else errorMessage = decoded
  }

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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center text-white">
          Planify
        </CardTitle>
        <CardDescription className="text-center text-blue-100/60">
          Hesabınıza giriş yapın
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert
            variant="destructive"
            className="mb-4 bg-red-500/10 border-red-500/30 text-red-300 [&>svg]:text-red-300"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Uyarı</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <form action={loginAction} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-blue-100/80 text-sm">
                Şifre
              </Label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                tabIndex={-1}
              >
                Şifremi unuttum?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-200"
            id="login-submit-btn"
          >
            Giriş Yap
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-blue-100/50">
          Hesabınız yok mu?{' '}
          <Link
            href="/register"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Kayıt olun
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
