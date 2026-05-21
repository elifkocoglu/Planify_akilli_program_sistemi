'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, Building2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface JoinInstitutionBannerProps {
  userId: string
}

export function JoinInstitutionBanner({ userId }: JoinInstitutionBannerProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [joining, setJoining] = useState(false)
  const [inviteData, setInviteData] = useState<{valid: boolean, institutionName?: string, role?: string, reason?: string} | null>(null)

  const handleVerify = async () => {
    if (!code || code.length < 4) {
      toast.error('Lütfen geçerli bir davet kodu girin')
      return
    }

    try {
      setVerifying(true)
      const res = await fetch(`/api/invitations/verify?code=${encodeURIComponent(code)}`)
      const data = await res.json()

      if (!data.valid) {
        setInviteData({ valid: false, reason: data.message || 'Geçersiz davet kodu' })
        toast.error(data.message || 'Geçersiz davet kodu')
      } else {
        setInviteData({
          valid: true,
          institutionName: data.institutionName,
          role: data.role
        })
      }
    } catch (error) {
      setInviteData({ valid: false, reason: 'Doğrulama hatası' })
      toast.error('Kod doğrulanırken bir hata oluştu')
    } finally {
      setVerifying(false)
    }
  }

  const handleJoin = async () => {
    if (!inviteData?.valid) return

    try {
      setJoining(true)
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId })
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Katılma işlemi başarısız oldu')
      }

      toast.success('Kuruma başarıyla katıldınız!')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-amber-400">
              Henüz bir kuruma bağlı değilsiniz
            </h3>
            <p className="text-amber-200/80 text-sm mt-1">
              Davet kodunuz varsa aşağıya girerek kurumunuza katılabilirsiniz.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                setInviteData(null)
              }}
              placeholder="DAVET KODU"
              className="bg-black/20 border-amber-500/20 text-white uppercase placeholder:text-white/30 font-mono tracking-widest"
              maxLength={8}
            />
            {!inviteData?.valid && (
              <Button 
                onClick={handleVerify} 
                disabled={verifying || code.length < 4}
                className="bg-amber-500 hover:bg-amber-600 text-white whitespace-nowrap"
              >
                {verifying ? 'Doğrulanıyor...' : 'Kodu Doğrula'}
              </Button>
            )}
          </div>

          {inviteData?.valid && (
            <div className="bg-black/20 rounded-lg p-4 border border-amber-500/20 max-w-xl">
              <div className="flex items-center gap-3 text-amber-100 mb-4">
                <Building2 className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="font-semibold">{inviteData.institutionName}</p>
                  <p className="text-xs text-amber-200/60 capitalize">Rol: {inviteData.role}</p>
                </div>
              </div>
              <Button 
                onClick={handleJoin} 
                disabled={joining}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {joining ? 'Katılıyorsunuz...' : 'Kuruma Katıl'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
