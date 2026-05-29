import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { SwapRequestForm } from '@/components/staff/SwapRequestForm'
import { Button } from '@/components/ui/button'

export default function AdminSwapNewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/swap">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Takas Yönetimi
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Yeni Takas Talebi</h1>
          <p className="text-slate-400 mt-1">
            Nöbetinizi takas etmek istediğiniz kişiyi ve slotu seçin.
          </p>
        </div>
      </div>

      {/* Form — SearchParams gerektirdiği için Suspense gerekli */}
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-slate-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Yükleniyor...
          </div>
        }
      >
        <SwapRequestForm redirectPath="/dashboard/admin/swap" />
      </Suspense>
    </div>
  )
}
