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
import { AlertCircle } from 'lucide-react'

interface ResetPasswordPageProps {
  searchParams: { error?: string }
}

export const metadata = {
  title: 'Şifreyi Sıfırla — Planify',
  description: 'Planify hesabınız için yeni şifre belirleyin.',
}

async function resetPasswordAction(formData: FormData): Promise<never> {
  'use server'
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (password !== confirmPassword) {
    redirect('/reset-password?error=Sifreler+eslesmiyor')
  }

  if (password.length < 6) {
    redirect('/reset-password?error=Sifre+en+az+6+karakter+olmali')
  }

  const supabase = createClient()

  try {
    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      redirect('/reset-password?error=Sifre+guncellenirken+hata+olustu')
    }
  } catch (err) {
    throw err
  }

  // After resetting password, they are fully authenticated with the new password.
  // We bounce them to dashboard, where middleware handles which role dashboard to show.
  redirect('/dashboard')
}

function getErrorMessage(error?: string): string | null {
  if (!error) return null
  const decoded = decodeURIComponent(error.replace(/\+/g, ' '))
  if (decoded.includes('eslesmiyor') || decoded.includes('eslesmıyor'))
    return 'Şifreler eşleşmiyor.'
  if (decoded.includes('6 karakter')) return 'Şifre en az 6 karakter olmalı.'
  return decoded
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const errorMessage = getErrorMessage(searchParams.error)
  const supabase = createClient()

  // Make sure they have a session. If they somehow didn't click the link or session expired:
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Session is required to reset password (we get one via PKCE or Implicit flow from email link)
    redirect('/login?error=Oturumunuz+gecersiz+veya+suresi+dolmus')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md px-4">
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
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-white">
              Yeni Şifre Belirle
            </CardTitle>
            <CardDescription className="text-center text-blue-100/60">
              Hesabınız için yeni ve güvenli bir şifre girin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <form action={resetPasswordAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-blue-100/80 text-sm">
                  Yeni Şifre
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
                  Yeni Şifre Tekrar
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
                id="reset-password-submit-btn"
              >
                Şifreyi Güncelle
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
