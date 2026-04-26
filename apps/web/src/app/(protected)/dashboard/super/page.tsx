'use client'

import { useUser } from '@/lib/auth/useUser'
import { signOutAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'

export default function SuperAdminDashboardPage() {
  const { profile } = useUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Süper Admin Paneli</h1>
        <p className="text-slate-400 mt-1">
          Sistem genelinde yönetim işlemlerini buradan yapabilirsiniz.
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center space-y-4">
        <p className="text-xl text-white font-medium">Bu sayfa yapım aşamasında.</p>
        
        <div className="bg-white/10 p-4 rounded-lg inline-block text-left mt-4">
          <p className="text-sm text-slate-300">Hoş geldiniz,</p>
          <p className="font-semibold text-white text-lg">{profile?.full_name}</p>
          <p className="text-xs text-blue-400 mt-1 uppercase tracking-wider">{profile?.role}</p>
        </div>

        <div className="pt-4 max-w-sm mx-auto">
          <form action={signOutAction}>
            <Button type="submit" variant="destructive" className="w-full">
              Çıkış Yap
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
