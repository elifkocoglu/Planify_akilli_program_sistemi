'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

import { getTitles, createTitle, updateTitle, deleteTitle } from '@/lib/api/titles'
import type { TitleRecord } from '@/lib/api/types'

export default function AdminTitlesPage() {
  const [titles, setTitles] = useState<TitleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formMinRequired, setFormMinRequired] = useState('0')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await getTitles()
      setTitles(res.titles ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unvanlar alınamadı')
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
    setFormMinRequired('0')
    setDialogOpen(true)
  }

  const openEdit = (t: TitleRecord) => {
    setEditingId(t.id)
    setFormName(t.name)
    setFormMinRequired(t.min_required_per_shift.toString())
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Unvan adı zorunludur')
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await updateTitle(editingId, {
          name: formName.trim(),
          minRequiredPerShift: parseInt(formMinRequired) || 0,
        })
        toast.success('Unvan güncellendi')
      } else {
        await createTitle({
          name: formName.trim(),
          minRequiredPerShift: parseInt(formMinRequired) || 0,
        })
        toast.success('Unvan oluşturuldu')
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
      await deleteTitle(id)
      toast.success('Unvan silindi')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unvan silinemedi')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Unvanlar</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading ? '...' : `${titles.length} unvan`}
          </p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Unvan Ekle
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-slate-400">Unvan Adı</TableHead>
              <TableHead className="text-slate-400 text-center">Vardiya Min Sayı</TableHead>
              <TableHead className="text-slate-400 text-center">Personel Sayısı</TableHead>
              <TableHead className="text-slate-400">Oluşturulma</TableHead>
              <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.04]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20 bg-white/10" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : titles.length === 0 ? (
              <TableRow className="border-white/[0.04]">
                <TableCell colSpan={5} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                      <Tag className="h-6 w-6 text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-500">Henüz unvan eklenmemiş</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              titles.map((t) => (
                <TableRow key={t.id} className="border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <TableCell className="text-sm font-medium text-white">{t.name}</TableCell>
                  <TableCell className="text-center text-sm text-slate-300">
                    {t.min_required_per_shift}
                  </TableCell>
                  <TableCell className="text-center text-sm text-slate-300">
                    {t.staff_count ?? 0}
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {new Date(t.created_at).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(t)}
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
                            <AlertDialogTitle className="text-white">Unvanı Sil</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              {t.name} unvanını silmek istediğinizden emin misiniz?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-red-600 hover:bg-red-700 text-white">Sil</AlertDialogAction>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? 'Unvan Düzenle' : 'Yeni Unvan'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Unvan Adı</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Örn: Doktor, Hemşire"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Vardiya Başına Minimum Gerekli Sayı</Label>
              <Input
                type="number"
                value={formMinRequired}
                onChange={(e) => setFormMinRequired(e.target.value)}
                min={0}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-slate-500">
                Her vardiyada bu unvandan en az kaç kişi olmalı? (0 = zorunlu değil)
              </p>
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
