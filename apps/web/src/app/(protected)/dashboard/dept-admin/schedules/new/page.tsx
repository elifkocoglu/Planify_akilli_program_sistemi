'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScheduleForm } from '@/components/schedules/ScheduleForm'

interface Department {
  id: string
  name: string
}

export default function DeptAdminNewSchedulePage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const response = await fetch('/api/departments')
        if (response.ok) {
          const data = await response.json()
          setDepartments(data.departments ?? [])
        }
      } catch {
        // Fallback: empty
      } finally {
        setLoading(false)
      }
    }
    fetchDepartments()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/dept-admin/schedules">
          <Button variant="ghost" size="icon-sm" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Yeni Bölüm Programı</h1>
          <p className="text-sm text-slate-400">Departmanınız için yeni bir program oluşturun</p>
        </div>
      </div>

      {/* Form */}
      {loading ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-center gap-4 mb-8">
            <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
            <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
            <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
            <Skeleton className="h-6 w-48 bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
          </div>
        </div>
      ) : (
        <ScheduleForm departments={departments} basePath="/dashboard/dept-admin" />
      )}
    </div>
  )
}
