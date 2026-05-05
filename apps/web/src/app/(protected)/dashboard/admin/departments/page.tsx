'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/lib/api/departments'
import type { DepartmentRecord } from '@/lib/api/types'

const typeConfig: Record<string, { label: string; className: string }> = {
  duty: { label: 'Nöbet', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  lesson: { label: 'Ders', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('duty')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await getDepartments()
      setDepartments(res.departments ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Departmanlar alınamadı')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openNew = () => {
    setEditingId(null)
    setFormName('')
    setFormType('duty')
    setDialogOpen(true)
  }

  const openEdit = (d: DepartmentRecord) => {
    setEditingId(d.id)
    setFormName(d.name)
    setFormType(d.type)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Departman adı zorunludur')
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await updateDepartment(editingId, { name: formName.trim(), type: formType })
        toast.success('Departman güncellendi')
      } else {
        await createDepartment({ name: formName.trim(), type: formType as 'duty' | 'lesson' })
        toast.success('Departman oluşturuldu')
      }
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'İşlem başarısız')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDepartment(id)
      toast.success('Departman silindi')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Departman silinemedi')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Departmanlar</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading ? '...' : `${departments.length} departman`}
          </p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Departman Ekle
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-slate-400">Ad</TableHead>
              <TableHead className="text-slate-400">Tip</TableHead>
              <TableHead className="text-slate-400">Oluşturulma</TableHead>
              <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.04]">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20 bg-white/10" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : departments.length === 0 ? (
              <TableRow className="border-white/[0.04]">
                <TableCell colSpan={4} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-500">Henüz departman eklenmemiş</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              departments.map((d) => {
                const tc = typeConfig[d.type]
                return (
                  <TableRow key={d.id} className="border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-sm font-medium text-white">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tc?.className}>
                        {tc?.label ?? d.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {new Date(d.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(d)}
                          className="text-slate-400 hover:text-white h-8 w-8 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-900 border-white/10">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Departmanı Sil</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                {d.name} departmanını silmek istediğinizden emin misiniz?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(d.id)} className="bg-red-600 hover:bg-red-700 text-white">Sil</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? 'Departman Düzenle' : 'Yeni Departman'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Departman Adı</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Örn: Acil Servis"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Tip</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="duty">Nöbet</SelectItem>
                  <SelectItem value="lesson">Ders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Oluştur'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
