'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSchedule, generateScheduleAPI } from '@/lib/api/schedules'

interface Department {
  id: string
  name: string
}

interface ScheduleFormProps {
  departments: Department[]
  basePath: string
}

export function ScheduleForm({ departments, basePath }: ScheduleFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'duty' | 'lesson'>('duty')
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '')
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Step 2
  const [dailySlotCount, setDailySlotCount] = useState(1)
  const [slotDuration, setSlotDuration] = useState(480)
  const [startHour, setStartHour] = useState('08:00')

  const durationOptions = [
    { value: 240, label: '4 saat' },
    { value: 480, label: '8 saat' },
    { value: 720, label: '12 saat' },
    { value: 1440, label: '24 saat' },
  ]

  const validateStep1 = () => {
    if (!title.trim()) return 'Program adı zorunludur'
    if (!departmentId) return 'Departman seçiniz'
    if (!startDate) return 'Başlangıç tarihi zorunludur'
    if (!endDate) return 'Bitiş tarihi zorunludur'
    if (new Date(startDate) >= new Date(endDate)) return 'Bitiş tarihi başlangıçtan büyük olmalıdır'
    return null
  }

  const handleNext = () => {
    if (step === 1) {
      const err = validateStep1()
      if (err) { setError(err); return }
    }
    setError(null)
    setStep(step + 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Schedule oluştur
      const scheduleResult = await createSchedule({
        title: title.trim(),
        type,
        periodType,
        departmentId,
        startDate,
        endDate,
      })

      const scheduleId = scheduleResult.schedule?.id
      if (!scheduleId) throw new Error('Program oluşturulamadı')

      // 2. Otomatik doldur
      await generateScheduleAPI({
        scheduleId,
        dailySlotCount,
        slotDuration,
        startHour,
      })

      // 3. Detay sayfasına yönlendir
      router.push(`${basePath}/schedules/${scheduleId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const deptName = departments.find((d) => d.id === departmentId)?.name ?? ''
  const durLabel = durationOptions.find((d) => d.value === slotDuration)?.label ?? ''

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-colors'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s < step
                  ? 'bg-emerald-500 text-white'
                  : s === step
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400/30'
                  : 'bg-white/5 text-slate-500 border border-white/10'
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`w-12 h-0.5 ${s < step ? 'bg-emerald-500' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        {/* Step 1: Program Bilgileri */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Program Bilgileri</h2>
              <p className="text-sm text-slate-400">Temel program bilgilerini girin.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Program Adı</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Ocak 2025 Nöbet Programı"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Program Tipi</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'duty' as const, label: 'Nöbet', desc: 'Vardiya tabanlı nöbet programı' },
                  { value: 'lesson' as const, label: 'Ders', desc: 'Ders ve sınıf programı' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      type === opt.value
                        ? 'border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/20'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <p className={`text-sm font-medium ${type === opt.value ? 'text-blue-400' : 'text-white'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Departman</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Periyot</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'weekly' as const, label: 'Haftalık' },
                  { value: 'monthly' as const, label: 'Aylık' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPeriodType(opt.value)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                      periodType === opt.value
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                        : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Başlangıç Tarihi</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Bitiş Tarihi</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Vardiya Ayarları */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Vardiya Ayarları</h2>
              <p className="text-sm text-slate-400">Otomatik doldurma için vardiya ayarlarını belirleyin.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Günlük Vardiya Sayısı</label>
              <input
                type="number"
                min={1}
                max={5}
                value={dailySlotCount}
                onChange={(e) => setDailySlotCount(parseInt(e.target.value) || 1)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Vardiya Süresi</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(parseInt(e.target.value))}
                className={inputClass}
              >
                {durationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Başlangıç Saati</label>
              <input type="time" value={startHour} onChange={(e) => setStartHour(e.target.value)} className={inputClass} />
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
              <p className="text-sm text-blue-300">
                Günde <strong>{dailySlotCount}</strong> vardiya, her biri{' '}
                <strong>{durLabel}</strong>, ilk vardiya{' '}
                <strong>{startHour}</strong>&apos;de başlar
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Onay */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Onay</h2>
              <p className="text-sm text-slate-400">Bilgileri kontrol edin ve programı oluşturun.</p>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Program Adı', value: title },
                { label: 'Tip', value: type === 'duty' ? 'Nöbet' : 'Ders' },
                { label: 'Departman', value: deptName },
                { label: 'Periyot', value: periodType === 'weekly' ? 'Haftalık' : 'Aylık' },
                { label: 'Tarih Aralığı', value: `${startDate} — ${endDate}` },
                { label: 'Günlük Vardiya', value: `${dailySlotCount} × ${durLabel}` },
                { label: 'Başlangıç Saati', value: startHour },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-sm text-slate-400">{item.label}</span>
                  <span className="text-sm font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
          <Button
            variant="ghost"
            onClick={() => { setError(null); setStep(step - 1) }}
            disabled={step === 1 || loading}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Geri
          </Button>

          {step < 3 ? (
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white">
              İleri
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Oluştur ve Otomatik Doldur
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
