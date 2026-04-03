'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SidebarNav } from './SidebarNav'
import type { UserRole } from '@/lib/auth/getRedirectPath'

interface MobileSidebarProps {
  role: UserRole
}

export function MobileSidebar({ role }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        id="mobile-menu-btn"
        className="md:hidden text-slate-400 hover:text-white hover:bg-white/10"
        onClick={() => setOpen(true)}
        aria-label="Menüyü aç"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-64 border-white/10 bg-slate-900 p-0"
        >
          <SheetHeader className="border-b border-white/10 px-6 py-4">
            <SheetTitle className="text-left text-white font-bold">
              Planify
            </SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <SidebarNav role={role} onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
