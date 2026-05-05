'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, UserPlus, Pencil, UserX, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'

import { StaffStatusBadge, RoleBadge } from './StaffStatusBadge'
import { getStaffList, toggleStaffStatus } from '@/lib/api/staff'
import type { StaffRecord, DepartmentRecord } from '@/lib/api/types'

interface StaffListProps {
  basePath: string
  onInvite: () => void
  departments: DepartmentRecord[]
}

const avatarColors = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-violet-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function StaffList({ basePath, onInvite, departments }: StaffListProps) {
  const [staff, setStaff] = useState<StaffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const filters: Record<string, string> = {}
      if (departmentFilter !== 'all') filters.departmentId = departmentFilter
      if (roleFilter !== 'all') filters.role = roleFilter
      if (statusFilter !== 'all') filters.isActive = statusFilter === 'active' ? 'true' : 'false'
      if (searchQuery.trim()) filters.search = searchQuery.trim()

      const data = await getStaffList(filters)
      setStaff(data.staff ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Personel listesi alınamadı')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentFilter, roleFilter, statusFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStaff()
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const activeCount = useMemo(() => staff.filter((s) => s.is_active).length, [staff])

  const handleToggleStatus = async (id: string, currentActive: boolean) => {
    try {
      setTogglingId(id)
      await toggleStaffStatus(id, !currentActive)
      toast.success(currentActive ? 'Personel pasif yapıldı' : 'Personel aktif yapıldı')
      fetchStaff()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'İşlem başarısız')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Personel</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading ? '...' : `${activeCount} aktif personel`}
          </p>
        </div>
        <Button
          onClick={onInvite}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Personel Davet Et
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Departman" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="all">Tüm Departmanlar</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="all">Tüm Roller</SelectItem>
            <SelectItem value="institution_admin">Kurum Yöneticisi</SelectItem>
            <SelectItem value="department_admin">Bölüm Yöneticisi</SelectItem>
            <SelectItem value="staff">Personel</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Pasif</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ad soyad ile ara..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-slate-400">Ad Soyad</TableHead>
              <TableHead className="text-slate-400">Departman</TableHead>
              <TableHead className="text-slate-400">Unvan</TableHead>
              <TableHead className="text-slate-400">Rol</TableHead>
              <TableHead className="text-slate-400 text-center">Bu Ay Nöbet</TableHead>
              <TableHead className="text-slate-400">Durum</TableHead>
              <TableHead className="text-slate-400">Kayıt Tarihi</TableHead>
              <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.04]">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20 bg-white/10" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : staff.length === 0 ? (
              <TableRow className="border-white/[0.04]">
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                      <Search className="h-6 w-6 text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-500">Personel bulunamadı</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => (
                <TableRow
                  key={member.id}
                  className="border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <TableCell>
                    <Link
                      href={`${basePath}/staff/${member.id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(
                          member.full_name
                        )} flex items-center justify-center flex-shrink-0 text-xs font-bold text-white`}
                      >
                        {getInitials(member.full_name)}
                      </div>
                      <span className="text-sm font-medium text-white">
                        {member.full_name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-300">
                    {member.departments?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-300">
                    {member.titles?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm font-medium text-white">
                      {member.slot_count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StaffStatusBadge isActive={member.is_active} />
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {new Date(member.created_at).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`${basePath}/staff/${member.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-white h-8 w-8 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 p-0 ${
                              member.is_active
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-emerald-400 hover:text-emerald-300'
                            }`}
                            disabled={togglingId === member.id}
                          >
                            {member.is_active ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">
                              {member.is_active
                                ? 'Personeli Pasif Yap'
                                : 'Personeli Aktif Yap'}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              {member.is_active
                                ? `${member.full_name} personelini pasif yapmak istediğinizden emin misiniz? Personel sisteme giriş yapamaz ancak geçmiş kayıtları silinmez.`
                                : `${member.full_name} personelini tekrar aktif yapmak istediğinizden emin misiniz?`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                              İptal
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleToggleStatus(member.id, member.is_active)}
                              className={
                                member.is_active
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }
                            >
                              {member.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
