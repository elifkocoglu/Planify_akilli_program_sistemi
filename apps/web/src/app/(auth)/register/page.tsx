'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
import { AlertCircle, CheckCircle2, Building2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { registerAction } from './actions'

function getErrorMessage(error?: string | null): string | null {
  if (!error) return null
  const decoded = decodeURIComponent(error.replace(/\+/g, ' '))
  if (decoded.includes('eslesmıyor') || decoded.includes('eslesmiyor'))
    return 'Şifreler eşleşmiyor.'
  if (decoded.includes('6 karakter')) return 'Şifre en az 6 karakter olmalı.'
  if (decoded.includes('kayitli')) return 'Bu e-posta zaten kayıtlı.'
  return decoded
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const paramError = searchParams.get('error')
  const isSuccess = searchParams.get('success') === '1'
  const urlCode = searchParams.get('code')

  const [hasCode, setHasCode] = useState(!!urlCode)
  const [inviteCode, setInviteCode] = useState(urlCode || '')
  const [inviteData, setInviteData] = useState<{valid: boolean, institution_name?: string, role?: string, reason?: string} | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  useEffect(() => {
    if (hasCode && inviteCode && inviteCode.length > 3) {
      const verifyCode = async () => {
        setVerifying(true)
        try {
          const res = await fetch(`/api/invitations/verify?code=${inviteCode}`)
          const data = await res.json()
          setInviteData(data)
        } catch (err) {
          setInviteData({ valid: false, reason: 'Kod doğrulanamadı' })
        } finally {
          setVerifying(false)
        }
      }
      
      const timeoutId = setTimeout(verifyCode, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setInviteData(null)
    }
  }, [inviteCode, hasCode])

  const errorMessage = clientError || getErrorMessage(paramError)

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setClientError(null)

    if (!inviteData?.valid) {
      setClientError('Lütfen geçerli bir davet kodu girin.')
      return
    }

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string
    const fullName = formData.get('full_name') as string

    if (password !== confirmPassword) {
      setClientError('Şifreler eşleşmiyor.')
      return
    }
    if (password.length < 6) {
      setClientError('Şifre en az 6 karakter olmalı.')
      return
    }

    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode, password, full_name: fullName })
      })

      const data = await res.json()
      if (data.success) {
        // Yeni sayfayı yenilemek ve context'i doldurmak için router.refresh kullanılabilir
        // veya direkt anasayfaya atılır middleware dashboarda seçer
        window.location.href = '/'
      } else {
        setClientError(data.error || 'Kayıt sırasında hata oluştu.')
      }
    } catch (err) {
      setClientError('Bir hata oluştu.')
    }
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center text-white">
          {hasCode ? 'Davet ile Katıl' : 'Hesap Oluştur'}
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
              <Alert variant="destructive" className="mb-4 bg-red-500/10 border-red-500/30 text-red-300 [&>svg]:text-red-300">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Uyarı</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {!urlCode && (
              <Label className="flex items-center space-x-2 text-sm text-blue-100/80 mb-6 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hasCode} 
                  onChange={(e) => {
                    setHasCode(e.target.checked)
                    setClientError(null)
                  }} 
                  className="rounded border-white/20 bg-white/5 text-blue-500 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 w-4 h-4"
                />
                <span>Davet kodunuz var mı?</span>
              </Label>
            )}

            {hasCode && (
              <div className="mb-6 space-y-2">
                <Label htmlFor="code" className="text-blue-100/80 text-sm">Davet Kodu</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Kodu girin"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400 uppercase"
                  disabled={!!urlCode}
                />
                {verifying && <p className="text-xs text-blue-300">Doğrulanıyor...</p>}
                {inviteData && inviteData.valid && (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm">
                    <Building2 className="w-5 h-5 shrink-0" />
                    <span><b>{inviteData.institution_name}</b> ailesine katılıyorsunuz.</span>
                  </div>
                )}
                {inviteData && !inviteData.valid && inviteCode.length > 3 && (
                  <p className="text-xs text-red-400">{inviteData.reason || 'Geçersiz davet kodu'}</p>
                )}
              </div>
            )}

            <form 
              action={hasCode ? undefined : registerAction} 
              onSubmit={hasCode ? handleInviteSubmit : undefined}
              className="space-y-4"
            >
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

              {!hasCode && (
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
              )}

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
                disabled={hasCode ? (!inviteData?.valid || verifying) : false}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
