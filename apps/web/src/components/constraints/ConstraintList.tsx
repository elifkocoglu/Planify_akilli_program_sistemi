'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
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

import { ConstraintTypeBadge, getConstraintSummary } from './ConstraintTypeBadge'
import { getConstraints, updateConstraint, deleteConstraint } from '@/lib/api/constraints'
import type { ConstraintRecord, DepartmentRecord } from '@/lib/api/types'

interface ConstraintListProps {
  basePath: string
  departments: DepartmentRecord[]
}

export function ConstraintList({ basePath, departments }: ConstraintListProps) {
  const [constraints, setConstraints] = useState<ConstraintRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')

  const fetchConstraints = async () => {
    try {
      setLoading(true)
      const filters: Record<string, string> = {}
      if (typeFilter !== 'all') filters.type = typeFilter
      if (deptFilter !== 'all') filters.departmentId = deptFilter
      if (activeFilter !== 'all') filters.isActive = activeFilter === 'active' ? 'true' : 'false'

      const data = await getConstraints(filters)
      setConstraints(data.constraints ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kısıtlar alınamadı')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConstraints()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, deptFilter, activeFilter])

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await updateConstraint(id, { is_active: !current })
      toast.success(current ? 'Kısıt pasif yapıldı' : 'Kısıt aktif yapıldı')
      fetchConstraints()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'İşlem başarısız')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteConstraint(id)
      toast.success('Kısıt silindi')
      fetchConstraints()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kısıt silinemedi')
    }
  }

  const getScope = (c: ConstraintRecord) => {
    if (c.staff_id && c.profiles?.full_name) return `Personel: ${c.profiles.full_name}`
    if (c.department_id && c.departments?.name) return `Departman: ${c.departments.name}`
    return 'Tüm Kurum'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Kısıtlar</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading ? '...' : `${constraints.length} kısıt`}
          </p>
        </div>
        <Link href={`${basePath}/constraints/new`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Kısıt Ekle
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Kısıt Tipi" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="all">Tüm Tipler</SelectItem>
            <SelectItem value="max_shifts_per_week">Haftada Max Nöbet</SelectItem>
            <SelectItem value="max_shifts_per_month">Ayda Max Nöbet</SelectItem>
            <SelectItem value="max_hours_per_week">Haftalık Max Saat</SelectItem>
            <SelectItem value="min_rest_hours">Min Dinlenme</SelectItem>
            <SelectItem value="no_consecutive_days">Ardışık Gün Yasağı</SelectItem>
            <SelectItem value="unavailable_day">Müsait Olmayan Gün</SelectItem>
            <SelectItem value="unavailable_date">Müsait Olmayan Tarih</SelectItem>
            <SelectItem value="unavailable_time">Müsait Olmayan Saat</SelectItem>
            <SelectItem value="min_staff_per_shift">Min Personel</SelectItem>
            <SelectItem value="max_staff_per_shift">Max Personel</SelectItem>
            <SelectItem value="not_together_shift">Birlikte Olamaz</SelectItem>
            <SelectItem value="must_together_shift">Birlikte Olmalı</SelectItem>
          </SelectContent>
        </Select>

        <Select value={deptFilter} onValueChange={setDeptFilter}>
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

        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Pasif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-slate-400">Kısıt Tipi</TableHead>
              <TableHead className="text-slate-400">Kapsam</TableHead>
              <TableHead className="text-slate-400">Değer</TableHead>
              <TableHead className="text-slate-400 text-center">Durum</TableHead>
              <TableHead className="text-slate-400">Tarih</TableHead>
              <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.04]">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20 bg-white/10" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : constraints.length === 0 ? (
              <TableRow className="border-white/[0.04]">
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                      <Search className="h-6 w-6 text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-500">Kısıt bulunamadı</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              constraints.map((c) => (
                <TableRow
                  key={c.id}
                  className="border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <TableCell>
                    <ConstraintTypeBadge type={c.type} />
                  </TableCell>
                  <TableCell className="text-sm text-slate-300">
                    {getScope(c)}
                  </TableCell>
                  <TableCell className="text-sm text-slate-300 max-w-[200px] truncate">
                    {getConstraintSummary(c.type, c.value)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={() => handleToggleActive(c.id, c.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {new Date(c.created_at).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Kısıtı Sil</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-400">
                            Bu kısıtı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                            İptal
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(c.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
