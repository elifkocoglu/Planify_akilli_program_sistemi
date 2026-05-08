'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { SwapRequestForm } from '@/components/staff/SwapRequestForm'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function SwapFormFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full bg-white/5" />
      <Skeleton className="h-24 w-full bg-white/5" />
      <Skeleton className="h-24 w-full bg-white/5" />
    </div>
  )
}

export default function NewSwapRequestPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/staff/swap"
          className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Takas Taleplerime Dön
        </Link>
        <h1 className="text-2xl font-bold text-white">Yeni Takas Talebi</h1>
        <p className="text-slate-400 mt-1">Nöbet takas talebinizi oluşturun.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <Suspense fallback={<SwapFormFallback />}>
          <SwapRequestForm />
        </Suspense>
      </div>
    </div>
  )
}
