import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
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

interface ForgotPasswordPageProps {
  searchParams: { error?: string; success?: string }
}

export const metadata = {
  title: 'Şifremi Unuttum — Planify',
  description: 'Planify hesabınızın şifresini sıfırlayın.',
}

async function forgotPasswordAction(formData: FormData): Promise<never> {
  'use server'
  const email = formData.get('email') as string
  const origin = headers().get('origin')

  const supabase = createClient()

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      redirect('/forgot-password?error=Sifre+sifirlama+e-postasi+gonderilemedi')
    }
  } catch (err) {
    throw err
  }

  redirect('/forgot-password?success=1')
}

function getErrorMessage(error?: string): string | null {
  if (!error) return null
  const decoded = decodeURIComponent(error.replace(/\+/g, ' '))
  return decoded
}

export default function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center text-white">
          Şifremi Unuttum
        </CardTitle>
        <CardDescription className="text-center text-blue-100/60">
          Hesabınıza kayıtlı e-posta adresini girin
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
            <h3 className="text-lg font-semibold text-white">
              E-posta Gönderildi
            </h3>
            <p className="text-sm text-blue-100/60 leading-relaxed">
              Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu (ve gerekiyorsa spam klasörünü) kontrol edin.
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
            <form action={forgotPasswordAction} className="space-y-4">
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
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-200"
                id="forgot-password-submit-btn"
              >
                Şifre Sıfırlama Bağlantısı Gönder
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-blue-100/50">
              <Link
                href="/login"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                ← Giriş sayfasına dön
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
