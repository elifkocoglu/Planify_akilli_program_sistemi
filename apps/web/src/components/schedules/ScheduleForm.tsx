'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  CalendarPlus,
  Brain,
  Sparkles,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createSchedule, generateScheduleAPI } from '@/lib/api/schedules'
import { createConstraint } from '@/lib/api/constraints'
import { toast } from 'sonner'
import type { ParsedConstraint } from '@/lib/api/types'

interface Department {
  id: string
  name: string
}

interface StaffItem {
  id: string
  fullName: string
  titleName?: string
}

interface ScheduleFormProps {
  departments: Department[]
  basePath: string
}

const TOTAL_STEPS = 4

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

  // Step 3: AI Asistan
  const [staffList, setStaffList] = useState<StaffItem[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiConstraints, setAiConstraints] = useState<ParsedConstraint[]>([])
  const [autoConstraints, setAutoConstraints] = useState<ParsedConstraint[]>([])
  const [unrecognized, setUnrecognized] = useState<string[]>([])
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiAnalyzed, setAiAnalyzed] = useState(false)
  const [savingConstraints, setSavingConstraints] = useState(false)
  const [savedConstraintCount, setSavedConstraintCount] = useState(0)

  const durationOptions = [
    { value: 240, label: '4 saat' },
    { value: 480, label: '8 saat' },
    { value: 720, label: '12 saat' },
    { value: 1440, label: '24 saat' },
  ]

  // Departman değişince personel listesini çek
  useEffect(() => {
    if (!departmentId) return
    let cancelled = false

    async function fetchStaff() {
      setStaffLoading(true)
      try {
        const res = await fetch(`/api/staff?departmentId=${departmentId}`)
        const data = await res.json()
        if (!cancelled && data.success && data.staff) {
          setStaffList(
            data.staff.map((s: { id: string; full_name: string; titles?: { name: string } | null }) => ({
              id: s.id,
              fullName: s.full_name,
              titleName: s.titles?.name,
            }))
          )
        }
      } catch {
        // Personel çekilemezse sessizce geç
      } finally {
        if (!cancelled) setStaffLoading(false)
      }
    }

    fetchStaff()
    return () => { cancelled = true }
  }, [departmentId])

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

  // ─── AI Analiz ────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!aiText.trim()) {
      setAiError('Lütfen kısıtları açıklayan bir metin girin')
      return
    }

    setAiLoading(true)
    setAiError(null)
    setAiConstraints([])
    setAutoConstraints([])
    setUnrecognized([])
    setAiSummary('')
    setAiAnalyzed(false)

    try {
      const res = await fetch('/api/ai/parse-constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: aiText,
          staffList,
          departmentId,
          institutionId: '', // Server tarafında profile'dan alınacak
          dateRange: { start: startDate, end: endDate },
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setAiError(data.error ?? 'AI analiz başarısız oldu')
        return
      }

      setAiConstraints(data.constraints ?? [])
      setAutoConstraints(data.autoConstraints ?? [])
      setUnrecognized(data.unrecognized ?? [])
      setAiSummary(data.summary ?? '')
      setAiAnalyzed(true)
    } catch {
      setAiError('AI servisiyle bağlantı kurulamadı')
    } finally {
      setAiLoading(false)
    }
  }

  const removeConstraint = (index: number) => {
    setAiConstraints((prev) => prev.filter((_, i) => i !== index))
  }

  const removeAutoConstraint = (index: number) => {
    setAutoConstraints((prev) => prev.filter((_, i) => i !== index))
  }

  // ─── Kısıtları Kaydet ────────────────────────────────
  const handleSaveConstraints = async () => {
    const allConstraints = [...aiConstraints, ...autoConstraints]
    if (allConstraints.length === 0) {
      setStep(4)
      return
    }

    setSavingConstraints(true)
    let saved = 0

    try {
      for (const c of allConstraints) {
        await createConstraint({
          type: c.type,
          value: c.value,
          departmentId,
          staffId: c.staffId ?? undefined,
        })
        saved++
      }

      setSavedConstraintCount(saved)
      toast.success(`${saved} kısıt başarıyla kaydedildi`)
      setStep(4)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Kısıt kaydedilemedi'
      setAiError(`${saved} kısıt kaydedildi, ancak bir hata oluştu: ${message}`)
    } finally {
      setSavingConstraints(false)
    }
  }

  // ─── Submit ──────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
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

      await generateScheduleAPI({
        scheduleId,
        dailySlotCount,
        slotDuration,
        startHour,
      })

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

  // ─── Constraint type label helper ────────────────────
  const getTypeLabel = (t: string) => {
    const map: Record<string, string> = {
      max_shifts_per_month: 'Aylık Maks Nöbet',
      max_shifts_per_week: 'Haftalık Maks Nöbet',
      max_hours_per_week: 'Haftalık Maks Saat',
      unavailable_day: 'Müsait Olmayan Gün',
      unavailable_date: 'Müsait Olmayan Tarih',
      min_rest_hours: 'Min Dinlenme',
      no_consecutive_days: 'Art Arda Yasak',
      must_together_shift: 'Birlikte Nöbet',
      not_together_shift: 'Ayrı Nöbet',
      min_staff_per_shift: 'Min Personel',
      max_staff_per_shift: 'Maks Personel',
    }
    return map[t] ?? t
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
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
            {s < TOTAL_STEPS && (
              <div className={`w-12 h-0.5 ${s < step ? 'bg-emerald-500' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        {/* ──── STEP 1: Program Bilgileri ──── */}
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

        {/* ──── STEP 2: Vardiya Ayarları ──── */}
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

        {/* ──── STEP 3: AI Asistan ──── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">AI Asistan ile Kısıt Tanımla</h2>
              </div>
              <p className="text-sm text-slate-400">
                Personel kurallarını düz yazıyla yazın, sistem otomatik tanımlasın.
                İsterseniz bu adımı atlayabilirsiniz.
              </p>
            </div>

            {/* Personel bilgisi */}
            {staffLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Personel listesi yükleniyor...
              </div>
            ) : staffList.length > 0 ? (
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-xs text-slate-400 mb-2">
                  <strong className="text-slate-300">{deptName}</strong> departmanından{' '}
                  <strong className="text-white">{staffList.length}</strong> personel mevcut
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {staffList.slice(0, 10).map((s) => (
                    <Badge
                      key={s.id}
                      variant="outline"
                      className="text-[10px] text-slate-300 border-white/10 bg-white/5"
                    >
                      {s.fullName}
                    </Badge>
                  ))}
                  {staffList.length > 10 && (
                    <Badge variant="outline" className="text-[10px] text-slate-500 border-white/10">
                      +{staffList.length - 10} kişi daha
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-300">
                  Bu departmanda personel bulunamadı. AI analizi personel eşleştirmesi yapamayacaktır.
                </p>
              </div>
            )}

            {/* Metin girişi */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">
                Kısıtları açıklayın
              </label>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={6}
                placeholder={`Örnek:\nAyşe 8 nöbet tutsun, Pazartesi yazma.\nFatma 6 nöbet tutsun, 15-20 Ocak izinli.\nHer vardiyada en az 1 doktor olsun.\nAli ve Mehmet aynı anda nöbet tutmasın.`}
                className={`${inputClass} resize-none`}
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={aiLoading || !aiText.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analiz ediliyor...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analiz Et
                </>
              )}
            </Button>

            {/* AI Hata */}
            {aiError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{aiError}</p>
              </div>
            )}

            {/* Sonuçlar */}
            {aiAnalyzed && (
              <div className="space-y-4 pt-2">
                {/* Özet */}
                {aiSummary && (
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3">
                    <p className="text-sm text-purple-300">{aiSummary}</p>
                  </div>
                )}

                {/* AI kısıtları */}
                {aiConstraints.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-300">
                      Tanınan kısıtlar ({aiConstraints.length})
                    </p>
                    {aiConstraints.map((c, i) => (
                      <div
                        key={i}
                        className="group flex items-start justify-between gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-emerald-300 flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>{c.description}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1 ml-5">
                            {getTypeLabel(c.type)}
                            {c.staffName && ` · ${c.staffName}`}
                          </p>
                        </div>
                        <button
                          onClick={() => removeConstraint(i)}
                          className="shrink-0 p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Otomatik izin kısıtları */}
                {autoConstraints.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-300">
                      Otomatik eklenen (izin kayıtları)
                    </p>
                    {autoConstraints.map((c, i) => (
                      <div
                        key={`auto-${i}`}
                        className="group flex items-start justify-between gap-3 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-blue-300 flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5 shrink-0" />
                            <span>{c.description}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1 ml-5">
                            İzin kaydından otomatik eklendi
                          </p>
                        </div>
                        <button
                          onClick={() => removeAutoConstraint(i)}
                          className="shrink-0 p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Anlaşılamayan ifadeler */}
                {unrecognized.length > 0 && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                    <p className="text-sm font-medium text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Şu ifadeler anlaşılamadı:
                    </p>
                    {unrecognized.map((u, i) => (
                      <p key={i} className="text-xs text-amber-300/70 ml-5">• {u}</p>
                    ))}
                    <p className="text-xs text-slate-400 mt-2 ml-5">
                      Lütfen bunları daha açık yazarak tekrar deneyin veya manuel kısıt olarak ekleyin.
                    </p>
                  </div>
                )}

                {/* Hiç kısıt bulunamadıysa */}
                {aiConstraints.length === 0 && autoConstraints.length === 0 && (
                  <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-center">
                    <p className="text-sm text-slate-400">
                      Metinden herhangi bir kısıt çıkarılamadı. Lütfen daha açık bir ifade kullanın.
                    </p>
                  </div>
                )}

                {/* Kaydet butonu */}
                {(aiConstraints.length > 0 || autoConstraints.length > 0) && (
                  <Button
                    onClick={handleSaveConstraints}
                    disabled={savingConstraints}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {savingConstraints ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {aiConstraints.length + autoConstraints.length} Kısıtı Kaydet ve Devam Et
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ──── STEP 4: Onay ──── */}
        {step === 4 && (
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

              {savedConstraintCount > 0 && (
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-slate-400">AI Kısıtları</span>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                    {savedConstraintCount} kısıt kaydedildi
                  </Badge>
                </div>
              )}
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

          {step < TOTAL_STEPS ? (
            <div className="flex items-center gap-2">
              {/* AI adımında "Atla" linki */}
              {step === 3 && (
                <Button
                  variant="ghost"
                  onClick={() => { setError(null); setStep(4) }}
                  className="text-slate-500 hover:text-slate-300 text-sm"
                >
                  Bu Adımı Atla
                </Button>
              )}
              {step !== 3 && (
                <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white">
                  İleri
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              )}
            </div>
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
