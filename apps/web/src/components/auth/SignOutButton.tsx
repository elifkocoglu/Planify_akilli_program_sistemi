'use client'

import { signOutAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        id="signout-btn"
        className="text-slate-400 hover:text-white hover:bg-white/10 transition-colors gap-2"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Çıkış Yap</span>
      </Button>
    </form>
  )
}
