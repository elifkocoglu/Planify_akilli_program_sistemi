'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { updateStaff } from '@/lib/api/staff'
import type { StaffRecord, DepartmentRecord, TitleRecord } from '@/lib/api/types'

interface StaffFormProps {
  staff: StaffRecord
  departments: DepartmentRecord[]
  titles: TitleRecord[]
  basePath: string
  canChangeRole?: boolean
}

export function StaffForm({ staff, departments, titles, basePath, canChangeRole }: StaffFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: staff.full_name,
    department_id: staff.department_id ?? '',
    title_id: staff.title_id ?? '',
    role: staff.role,
    weekly_max_hours: staff.weekly_max_hours?.toString() ?? '',
    monthly_max_shifts: staff.monthly_max_shifts?.toString() ?? '',
  })

  useEffect(() => {
    setForm({
      full_name: staff.full_name,
      department_id: staff.department_id ?? '',
      title_id: staff.title_id ?? '',
      role: staff.role,
      weekly_max_hours: staff.weekly_max_hours?.toString() ?? '',
      monthly_max_shifts: staff.monthly_max_shifts?.toString() ?? '',
    })
  }, [staff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.full_name.trim()) {
      toast.error('Ad soyad zorunludur')
      return
    }

    try {
      setSaving(true)
      await updateStaff(staff.id, {
        full_name: form.full_name.trim(),
        department_id: form.department_id || null,
        title_id: form.title_id || null,
        role: canChangeRole ? form.role : undefined,
        weekly_max_hours: form.weekly_max_hours ? parseInt(form.weekly_max_hours) : null,
        monthly_max_shifts: form.monthly_max_shifts ? parseInt(form.monthly_max_shifts) : null,
      })
      toast.success('Personel bilgileri güncellendi')
      router.push(`${basePath}/staff/${staff.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Güncelleme başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Geri
          </Button>
          <h1 className="text-xl font-bold text-white">Personel Düzenle</h1>
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {/* Ad Soyad */}
          <div className="space-y-2">
            <Label className="text-slate-300">Ad Soyad</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Personelin adı soyadı"
            />
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label className="text-slate-300">Rol</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              disabled={!canChangeRole}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="institution_admin">Kurum Yöneticisi</SelectItem>
                <SelectItem value="department_admin">Bölüm Yöneticisi</SelectItem>
                <SelectItem value="staff">Personel</SelectItem>
              </SelectContent>
            </Select>
            {!canChangeRole && (
              <p className="text-xs text-slate-500">
                Rol değiştirme yetkisi sadece kurum yöneticisine aittir
              </p>
            )}
          </div>

          {/* Departman */}
          <div className="space-y-2">
            <Label className="text-slate-300">Departman</Label>
            <Select
              value={form.department_id}
              onValueChange={(v) => setForm((f) => ({ ...f, department_id: v }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Departman seçin" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unvan */}
          <div className="space-y-2">
            <Label className="text-slate-300">Unvan</Label>
            <Select
              value={form.title_id}
              onValueChange={(v) => setForm((f) => ({ ...f, title_id: v }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Unvan seçin" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {titles.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Haftalık Max Saat */}
          <div className="space-y-2">
            <Label className="text-slate-300">Haftalık Max Çalışma Saati</Label>
            <Input
              type="number"
              value={form.weekly_max_hours}
              onChange={(e) => setForm((f) => ({ ...f, weekly_max_hours: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Opsiyonel"
              min={0}
            />
          </div>

          {/* Aylık Max Nöbet */}
          <div className="space-y-2">
            <Label className="text-slate-300">Aylık Max Nöbet Sayısı</Label>
            <Input
              type="number"
              value={form.monthly_max_shifts}
              onChange={(e) => setForm((f) => ({ ...f, monthly_max_shifts: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Opsiyonel"
              min={0}
            />
          </div>
        </div>
      </div>
    </form>
  )
}
