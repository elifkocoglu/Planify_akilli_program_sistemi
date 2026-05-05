'use client'

import { Badge } from '@/components/ui/badge'

const constraintTypeConfig: Record<
  string,
  { label: string; group: string; className: string }
> = {
  max_shifts_per_week: {
    label: 'Haftada Max Nöbet',
    group: 'Zaman',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  },
  max_shifts_per_month: {
    label: 'Ayda Max Nöbet',
    group: 'Zaman',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  },
  max_hours_per_week: {
    label: 'Haftalık Max Saat',
    group: 'Zaman',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  },
  min_rest_hours: {
    label: 'Min Dinlenme',
    group: 'Zaman',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  },
  no_consecutive_days: {
    label: 'Ardışık Gün Yasağı',
    group: 'Zaman',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  },
  unavailable_day: {
    label: 'Müsait Olmayan Gün',
    group: 'Müsaitlik',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  },
  unavailable_date: {
    label: 'Müsait Olmayan Tarih',
    group: 'Müsaitlik',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  },
  unavailable_time: {
    label: 'Müsait Olmayan Saat',
    group: 'Müsaitlik',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  },
  required_title_per_shift: {
    label: 'Zorunlu Unvan',
    group: 'Vardiya',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  },
  min_staff_per_shift: {
    label: 'Min Personel',
    group: 'Vardiya',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  },
  max_staff_per_shift: {
    label: 'Max Personel',
    group: 'Vardiya',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  },
  not_together_shift: {
    label: 'Birlikte Olamaz',
    group: 'Vardiya',
    className: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  },
  must_together_shift: {
    label: 'Birlikte Olmalı',
    group: 'Vardiya',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  },
  teacher_no_overlap: {
    label: 'Öğretmen Çakışma',
    group: 'Ders',
    className: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  },
  class_no_overlap: {
    label: 'Sınıf Çakışma',
    group: 'Ders',
    className: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  },
}

export function ConstraintTypeBadge({ type }: { type: string }) {
  const config = constraintTypeConfig[type] ?? {
    label: type,
    group: 'Diğer',
    className: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  }

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

export function getConstraintLabel(type: string): string {
  return constraintTypeConfig[type]?.label ?? type
}

export function getConstraintGroup(type: string): string {
  return constraintTypeConfig[type]?.group ?? 'Diğer'
}

/** Kısıt değerini okunabilir stringe çevir */
export function getConstraintSummary(type: string, value: Record<string, unknown>): string {
  const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

  switch (type) {
    case 'max_shifts_per_week':
      return `Haftada en fazla ${value.maxShifts ?? value.count ?? '?'} nöbet`
    case 'max_shifts_per_month':
      return `Ayda en fazla ${value.maxShifts ?? value.count ?? '?'} nöbet`
    case 'max_hours_per_week':
      return `Haftada en fazla ${value.hours ?? '?'} saat`
    case 'min_rest_hours':
      return `Nöbetler arası min ${value.hours ?? '?'} saat`
    case 'no_consecutive_days':
      return `${value.maxDays ?? value.days ?? '?'} günden fazla art arda olamaz`
    case 'unavailable_day': {
      const days = (value.days as number[]) ?? []
      return days.map((d: number) => dayNames[d] ?? d).join(', ') + ' müsait değil'
    }
    case 'unavailable_date': {
      const dates = (value.dates as string[]) ?? []
      return dates.length > 0 ? `${dates.length} tarih müsait değil` : 'Tarih belirlenmemiş'
    }
    case 'unavailable_time':
      return `${value.startTime ?? '?'} - ${value.endTime ?? '?'} arası müsait değil`
    case 'min_staff_per_shift':
      return `Vardiyada en az ${value.count ?? '?'} personel`
    case 'max_staff_per_shift':
      return `Vardiyada en fazla ${value.count ?? '?'} personel`
    case 'required_title_per_shift':
      return `Vardiyada en az ${value.count ?? '?'} adet zorunlu unvan`
    case 'not_together_shift':
      return `${((value.staffIds as string[]) ?? []).length} kişi birlikte olamaz`
    case 'must_together_shift':
      return `${((value.staffIds as string[]) ?? []).length} kişi birlikte olmalı`
    default:
      return JSON.stringify(value)
  }
}

export { constraintTypeConfig }
