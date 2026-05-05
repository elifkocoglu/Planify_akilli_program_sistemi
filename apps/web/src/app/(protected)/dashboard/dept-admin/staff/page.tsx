'use client'

import { useState, useEffect } from 'react'
import { StaffList } from '@/components/staff/StaffList'
import { InviteModal } from '@/components/staff/InviteModal'
import { Skeleton } from '@/components/ui/skeleton'
import type { DepartmentRecord } from '@/lib/api/types'

export default function DeptAdminStaffPage() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDepts() {
      try {
        const res = await fetch('/api/departments')
        const data = await res.json()
        setDepartments(data.departments ?? [])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchDepts()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 bg-white/10" />
        <Skeleton className="h-10 w-full bg-white/10" />
        <Skeleton className="h-64 w-full bg-white/10" />
      </div>
    )
  }

  return (
    <>
      <StaffList
        basePath="/dashboard/dept-admin"
        onInvite={() => setInviteOpen(true)}
        departments={departments}
      />
      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        departments={departments}
      />
    </>
  )
}
