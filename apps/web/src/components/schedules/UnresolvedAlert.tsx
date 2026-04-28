'use client'

import { AlertTriangle } from 'lucide-react'
import type { UnresolvedSlot } from '@planify/shared'

interface UnresolvedAlertProps {
  unresolved: UnresolvedSlot[]
}

export function UnresolvedAlert({ unresolved }: UnresolvedAlertProps) {
  if (unresolved.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-amber-400 mb-1">
            {unresolved.length} slot için uygun personel bulunamadı
          </h4>
          <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto">
            {unresolved.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs text-amber-300/70"
              >
                <span className="w-1 h-1 rounded-full bg-amber-400/50 flex-shrink-0" />
                <span>{item.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
