'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { StaffForm } from '@/components/staff/StaffForm'
import { Skeleton } from '@/components/ui/skeleton'
import { getStaffDetail } from '@/lib/api/staff'
import { useUser } from '@/lib/auth/useUser'
import type { StaffRecord, DepartmentRecord, TitleRecord } from '@/lib/api/types'

export default function AdminStaffEditPage({
  params,
}: {
  params: { id: string }
}) {
  const { profile } = useUser()
  const [staff, setStaff] = useState<StaffRecord | null>(null)
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [titles, setTitles] = useState<TitleRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [staffRes, deptRes, titleRes] = await Promise.all([
          getStaffDetail(params.id),
          fetch('/api/departments').then((r) => r.json()),
          fetch('/api/titles').then((r) => r.json()),
        ])
        setStaff(staffRes.staff ?? null)
        setDepartments(deptRes.departments ?? [])
        setTitles(titleRes.titles ?? [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Veri alınamadı')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-60 bg-white/10" />
        <Skeleton className="h-80 w-full bg-white/10" />
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-400">Personel bulunamadı</p>
      </div>
    )
  }

  return (
    <StaffForm
      staff={staff}
      departments={departments}
      titles={titles}
      basePath="/dashboard/admin"
      canChangeRole={profile.role === 'institution_admin'}
    />
  )
}
