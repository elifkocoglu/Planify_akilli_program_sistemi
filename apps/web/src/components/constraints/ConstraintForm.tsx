'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, ChevronRight } from 'lucide-react'

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

import { createConstraint } from '@/lib/api/constraints'
import { ConstraintTypeBadge, getConstraintSummary, constraintTypeConfig } from './ConstraintTypeBadge'
import type { DepartmentRecord, StaffRecord } from '@/lib/api/types'

interface ConstraintFormProps {
  departments: DepartmentRecord[]
  staffList: StaffRecord[]
  basePath: string
}

const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

const typesByGroup: Record<string, Array<{ value: string; label: string }>> = {
  'Zaman Kısıtları': [
    { value: 'max_shifts_per_week', label: 'Haftada max nöbet sayısı' },
    { value: 'max_shifts_per_month', label: 'Ayda max nöbet sayısı' },
    { value: 'max_hours_per_week', label: 'Haftalık max çalışma saati' },
    { value: 'min_rest_hours', label: 'Minimum dinlenme süresi' },
    { value: 'no_consecutive_days', label: 'Ardışık gün yasağı' },
  ],
  'Müsaitlik Kısıtları': [
    { value: 'unavailable_day', label: 'Müsait olmayan gün' },
    { value: 'unavailable_date', label: 'Müsait olmayan tarih' },
    { value: 'unavailable_time', label: 'Müsait olmayan saat aralığı' },
  ],
  'Vardiya Kısıtları': [
    { value: 'min_staff_per_shift', label: 'Aynı anda min personel' },
    { value: 'max_staff_per_shift', label: 'Aynı anda max personel' },
    { value: 'required_title_per_shift', label: 'Zorunlu unvan' },
    { value: 'not_together_shift', label: 'Birlikte olamaz' },
    { value: 'must_together_shift', label: 'Birlikte olmalı' },
  ],
  'Ders Kısıtları': [
    { value: 'teacher_no_overlap', label: 'Öğretmen çakışma yasağı' },
    { value: 'class_no_overlap', label: 'Sınıf çakışma yasağı' },
  ],
}

export function ConstraintForm({ departments, staffList, basePath }: ConstraintFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetStaffId = searchParams.get('staffId')

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1: Scope
  const [scope, setScope] = useState<'all' | 'department' | 'staff'>(
    presetStaffId ? 'staff' : 'all'
  )
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedStaff, setSelectedStaff] = useState(presetStaffId ?? '')

  // Step 2: Type
  const [selectedType, setSelectedType] = useState('')

  // Step 3: Value (dynamic)
  const [numberValue, setNumberValue] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [newDate, setNewDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])

  const buildValue = (): Record<string, unknown> => {
    switch (selectedType) {
      case 'max_shifts_per_week':
      case 'max_shifts_per_month':
        return { maxShifts: parseInt(numberValue) || 0 }
      case 'max_hours_per_week':
        return { hours: parseInt(numberValue) || 0 }
      case 'min_rest_hours':
        return { hours: parseInt(numberValue) || 0 }
      case 'no_consecutive_days':
        return { maxDays: parseInt(numberValue) || 0 }
      case 'unavailable_day':
        return { days: selectedDays }
      case 'unavailable_date':
        return { dates }
      case 'unavailable_time':
        return { startTime, endTime }
      case 'min_staff_per_shift':
      case 'max_staff_per_shift':
        return { count: parseInt(numberValue) || 0 }
      case 'required_title_per_shift':
        return { titleId: selectedStaff, count: parseInt(numberValue) || 1 }
      case 'not_together_shift':
      case 'must_together_shift':
        return { staffIds: selectedStaffIds }
      default:
        return {}
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await createConstraint({
        type: selectedType,
        value: buildValue(),
        departmentId: scope === 'department' ? selectedDept : null,
        staffId: scope === 'staff' ? selectedStaff : null,
      })
      toast.success('Kısıt başarıyla eklendi')
      router.push(`${basePath}/constraints`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kısıt eklenemedi')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const addDate = () => {
    if (newDate && !dates.includes(newDate)) {
      setDates((prev) => [...prev, newDate])
      setNewDate('')
    }
  }

  const toggleStaffId = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const canAdvance = () => {
    if (step === 1) {
      if (scope === 'department' && !selectedDept) return false
      if (scope === 'staff' && !selectedStaff) return false
      return true
    }
    if (step === 2) return !!selectedType
    if (step === 3) {
      switch (selectedType) {
        case 'unavailable_day':
          return selectedDays.length > 0
        case 'unavailable_date':
          return dates.length > 0
        case 'unavailable_time':
          return !!startTime && !!endTime
        case 'not_together_shift':
        case 'must_together_shift':
          return selectedStaffIds.length >= 2
        default:
          return !!numberValue
      }
    }
    return true
  }

  const steps = ['Kapsam', 'Kısıt Tipi', 'Değer', 'Önizleme']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Geri
        </Button>
        <h1 className="text-xl font-bold text-white">Kısıt Ekle</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i + 1 === step
                  ? 'bg-blue-600/20 text-blue-400'
                  : i + 1 < step
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'bg-white/5 text-slate-500'
              }`}
            >
              {i + 1 < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        {/* Step 1: Scope */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Bu kısıt kime uygulanacak?</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: 'all' as const, label: 'Tüm Kurum', desc: 'Tüm personele uygulanır' },
                { value: 'department' as const, label: 'Belirli Departman', desc: 'Sadece seçilen departmana' },
                { value: 'staff' as const, label: 'Belirli Personel', desc: 'Sadece seçilen kişiye' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScope(opt.value)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    scope === opt.value
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>

            {scope === 'department' && (
              <div className="space-y-2">
                <Label className="text-slate-300">Departman</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'staff' && (
              <div className="space-y-2">
                <Label className="text-slate-300">Personel</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Personel seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Type */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-white">Kısıt Tipi Seçin</h2>
            {Object.entries(typesByGroup).map(([group, types]) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {group}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {types.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setSelectedType(t.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedType === t.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Value */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Değer Girin</h2>

            {/* Number inputs */}
            {['max_shifts_per_week', 'max_shifts_per_month', 'max_hours_per_week', 'min_rest_hours', 'no_consecutive_days', 'min_staff_per_shift', 'max_staff_per_shift'].includes(selectedType) && (
              <div className="space-y-2">
                <Label className="text-slate-300">
                  {selectedType === 'max_shifts_per_week' && 'Haftada en fazla kaç nöbet?'}
                  {selectedType === 'max_shifts_per_month' && 'Ayda en fazla kaç nöbet?'}
                  {selectedType === 'max_hours_per_week' && 'Haftada en fazla kaç saat?'}
                  {selectedType === 'min_rest_hours' && 'Nöbetler arası minimum kaç saat?'}
                  {selectedType === 'no_consecutive_days' && 'Kaç günden fazla art arda olamaz?'}
                  {selectedType === 'min_staff_per_shift' && 'Vardiyada en az kaç personel?'}
                  {selectedType === 'max_staff_per_shift' && 'Vardiyada en fazla kaç personel?'}
                </Label>
                <Input
                  type="number"
                  value={numberValue}
                  onChange={(e) => setNumberValue(e.target.value)}
                  min={1}
                  className="bg-white/5 border-white/10 text-white max-w-xs"
                />
              </div>
            )}

            {/* Day checkboxes */}
            {selectedType === 'unavailable_day' && (
              <div className="space-y-2">
                <Label className="text-slate-300">Müsait olmayan günler</Label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        selectedDays.includes(i)
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date picker */}
            {selectedType === 'unavailable_date' && (
              <div className="space-y-3">
                <Label className="text-slate-300">Müsait olmayan tarihler</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="bg-white/5 border-white/10 text-white max-w-xs"
                  />
                  <Button
                    type="button"
                    onClick={addDate}
                    variant="outline"
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Ekle
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dates.map((d) => (
                    <Badge
                      key={d}
                      variant="outline"
                      className="bg-amber-500/15 text-amber-400 border-amber-500/20 cursor-pointer"
                      onClick={() => setDates((prev) => prev.filter((x) => x !== d))}
                    >
                      {new Date(d).toLocaleDateString('tr-TR')} ✕
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Time range */}
            {selectedType === 'unavailable_time' && (
              <div className="grid gap-4 sm:grid-cols-2 max-w-md">
                <div className="space-y-2">
                  <Label className="text-slate-300">Başlangıç Saati</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Bitiş Saati</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            )}

            {/* Staff multi-select */}
            {['not_together_shift', 'must_together_shift'].includes(selectedType) && (
              <div className="space-y-3">
                <Label className="text-slate-300">
                  {selectedType === 'not_together_shift'
                    ? 'Birlikte olamayacak personeller (en az 2 seçin)'
                    : 'Birlikte olması gereken personeller (en az 2 seçin)'}
                </Label>
                <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto">
                  {staffList.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleStaffId(s.id)}
                      className={`p-2 rounded-lg border text-left text-sm transition-all ${
                        selectedStaffIds.includes(s.id)
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {s.full_name}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedStaffIds.map((id) => {
                    const s = staffList.find((x) => x.id === id)
                    return (
                      <Badge
                        key={id}
                        variant="outline"
                        className="bg-blue-500/15 text-blue-400 border-blue-500/20 cursor-pointer"
                        onClick={() => toggleStaffId(id)}
                      >
                        {s?.full_name ?? id} ✕
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Required title */}
            {selectedType === 'required_title_per_shift' && (
              <div className="space-y-2">
                <Label className="text-slate-300">Minimum sayı</Label>
                <Input
                  type="number"
                  value={numberValue}
                  onChange={(e) => setNumberValue(e.target.value)}
                  min={1}
                  className="bg-white/5 border-white/10 text-white max-w-xs"
                  placeholder="En az kaç adet?"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Önizleme</h2>
            <div className="p-4 rounded-lg bg-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Tip:</span>
                <ConstraintTypeBadge type={selectedType} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Kapsam:</span>
                <span className="text-sm text-white">
                  {scope === 'all' && 'Tüm Kurum'}
                  {scope === 'department' && `Departman: ${departments.find((d) => d.id === selectedDept)?.name ?? ''}`}
                  {scope === 'staff' && `Personel: ${staffList.find((s) => s.id === selectedStaff)?.full_name ?? ''}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Değer:</span>
                <span className="text-sm text-white">
                  {getConstraintSummary(selectedType, buildValue())}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            İleri
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        )}
      </div>
    </div>
  )
}
