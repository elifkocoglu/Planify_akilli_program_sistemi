'use client'

import { useState, useEffect } from 'react'
import { ConstraintForm } from '@/components/constraints/ConstraintForm'
import { Skeleton } from '@/components/ui/skeleton'
import type { DepartmentRecord, StaffRecord } from '@/lib/api/types'

export default function AdminNewConstraintPage() {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [staffList, setStaffList] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [deptRes, staffRes] = await Promise.all([
          fetch('/api/departments').then((r) => r.json()),
          fetch('/api/staff').then((r) => r.json()),
        ])
        setDepartments(deptRes.departments ?? [])
        setStaffList(staffRes.staff ?? [])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 bg-white/10" />
        <Skeleton className="h-64 w-full bg-white/10" />
      </div>
    )
  }

  return (
    <ConstraintForm
      departments={departments}
      staffList={staffList}
      basePath="/dashboard/admin"
    />
  )
}
