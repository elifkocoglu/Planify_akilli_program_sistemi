'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/auth/useUser'
import { createSwapRequest } from '@/lib/api/swap-requests'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRightLeft, ChevronRight, Clock, Loader2, MapPin } from 'lucide-react'

interface SlotOption {
  id: string
  date: string
  start_time: string
  end_time: string
  department_id: string | null
  department_name?: string
}

interface StaffOption {
  id: string
  full_name: string
  role?: string
  department_id?: string | null
}

function formatTime(t: string) { return t.slice(0, 5) }
function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', weekday: 'short',
  })
}

interface SwapRequestFormProps {
  redirectPath?: string
}

export function SwapRequestForm({ redirectPath = '/dashboard/staff/swap' }: SwapRequestFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useUser()
  const preSelectedSlotId = searchParams.get('mySlotId')

  const [step, setStep] = useState(1)
  const [mySlots, setMySlots] = useState<SlotOption[]>([])
  const [selectedMySlot, setSelectedMySlot] = useState<string>(preSelectedSlotId || '')
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [theirSlots, setTheirSlots] = useState<SlotOption[]>([])
  const [selectedTheirSlot, setSelectedTheirSlot] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // 1) Kendi slotlarımı yükle
  useEffect(() => {
    const fetchMySlots = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('schedule_slots')
        .select('id, date, start_time, end_time, department_id, departments(name)')
        .eq('staff_id', profile.id)
        .eq('status', 'active')
        .gte('date', today)
        .order('date', { ascending: true })

      if (data) {
        setMySlots(data.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          date: s.date as string,
          start_time: s.start_time as string,
          end_time: s.end_time as string,
          department_id: s.department_id as string | null,
          department_name: (s.departments as Record<string, string> | null)?.name,
        })))
      }
      setLoading(false)
    }
    fetchMySlots()
  }, [profile.id, today])

  // 2) Aynı kurumdaki aktif personelleri yükle (departman filtresi yok)
  const fetchStaffList = useCallback(async () => {
    if (!selectedMySlot) return

    const supabase = createClient()
    console.log('institutionId:', profile?.institution_id)
    console.log('userId:', profile?.id)
    console.log('departmentId:', profile?.department_id)

    // institutionId yoksa sorgu çalıştırma
    if (!profile?.institution_id) {
      console.error('institutionId bulunamadı')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('institution_id', profile.institution_id)
      .eq('is_active', true)
      .neq('id', profile.id)
      .order('full_name', { ascending: true })

    if (error) console.error('Sorgu hatası:', error)
    console.log('Bulunan kişiler:', data)

    setStaffList(data || [])
  }, [selectedMySlot, profile.id, profile.institution_id, profile.department_id])

  useEffect(() => {
    fetchStaffList()
  }, [fetchStaffList])

  // 3) Seçilen personelin slotlarını yükle
  useEffect(() => {
    if (!selectedStaff) {
      setTheirSlots([])
      return
    }

    const fetchTheirSlots = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('schedule_slots')
        .select('id, date, start_time, end_time, department_id, departments(name)')
        .eq('staff_id', selectedStaff)
        .eq('status', 'active')
        .gte('date', today)
        .order('date', { ascending: true })

      if (data) {
        setTheirSlots(data.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          date: s.date as string,
          start_time: s.start_time as string,
          end_time: s.end_time as string,
          department_id: s.department_id as string | null,
          department_name: (s.departments as Record<string, string> | null)?.name,
        })))
      }
    }
    fetchTheirSlots()
  }, [selectedStaff, today])

  const mySlotData = mySlots.find((s) => s.id === selectedMySlot)
  const staffData = staffList.find((s) => s.id === selectedStaff)
  const theirSlotData = theirSlots.find((s) => s.id === selectedTheirSlot)

  const handleSubmit = async () => {
    if (!selectedMySlot || !selectedStaff || !selectedTheirSlot) return

    setSubmitting(true)
    try {
      await createSwapRequest({
        requesterSlotId: selectedMySlot,
        receiverSlotId: selectedTheirSlot,
        receiverId: selectedStaff,
      })
      toast.success('Takas talebiniz gönderildi')
      router.push(redirectPath)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 py-8">
        <Loader2 className="w-5 h-5 animate-spin" />
        Nöbetler yükleniyor...
      </div>
    )
  }

  if (mySlots.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-slate-400">Takas edilebilecek gelecek nöbetiniz bulunmuyor.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Step Indicators */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-slate-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && <ChevronRight className="w-4 h-4 text-slate-600" />}
          </div>
        ))}
        <span className="ml-3 text-sm text-slate-400">
          {step === 1 && 'Nöbetinizi seçin'}
          {step === 2 && 'Karşı tarafı seçin'}
          {step === 3 && 'Onaylayın'}
        </span>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <Label className="text-slate-300 text-base">Takas etmek istediğiniz nöbet:</Label>
          <div className="space-y-2">
            {mySlots.map((slot) => (
              <label
                key={slot.id}
                className={`flex items-center gap-4 rounded-lg p-4 border cursor-pointer transition-all ${
                  selectedMySlot === slot.id
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="mySlot"
                  value={slot.id}
                  checked={selectedMySlot === slot.id}
                  onChange={() => setSelectedMySlot(slot.id)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  selectedMySlot === slot.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-white/30'
                }`}>
                  {selectedMySlot === slot.id && (
                    <div className="w-full h-full rounded-full bg-white scale-[0.4]" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{formatDate(slot.date)}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </span>
                    {slot.department_name && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="w-3 h-3" />
                        {slot.department_name}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <Button
            onClick={() => setStep(2)}
            disabled={!selectedMySlot}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Devam Et
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-300 text-base">Takas istediğiniz kişi:</Label>
            <Select value={selectedStaff} onValueChange={(v) => { setSelectedStaff(v); setSelectedTheirSlot('') }}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Personel seçin" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/10">
                {staffList.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-400">Uygun personel bulunamadı</div>
                ) : (
                  staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white hover:bg-white/10">
                      <div className="flex items-center gap-2">
                        <span>{s.full_name}</span>
                        {s.role === 'department_admin' && (
                          <span className="text-xs text-slate-400">(Departman Yöneticisi)</span>
                        )}
                        {s.role === 'institution_admin' && (
                          <span className="text-xs text-slate-400">(Kurum Yöneticisi)</span>
                        )}
                        {s.department_id && profile.department_id && s.department_id !== profile.department_id && (
                          <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Farklı departman</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedStaff && (
            <div className="space-y-2">
              <Label className="text-slate-300 text-base">Onun nöbetlerinden birini seçin:</Label>
              {theirSlots.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">Bu personelin gelecek nöbeti bulunmuyor.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {theirSlots.map((slot) => (
                    <label
                      key={slot.id}
                      className={`flex items-center gap-4 rounded-lg p-3 border cursor-pointer transition-all ${
                        selectedTheirSlot === slot.id
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="theirSlot"
                        value={slot.id}
                        checked={selectedTheirSlot === slot.id}
                        onChange={() => setSelectedTheirSlot(slot.id)}
                        className="sr-only"
                      />
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                        selectedTheirSlot === slot.id ? 'border-blue-500 bg-blue-500' : 'border-white/30'
                      }`} />
                      <div>
                        <p className="text-sm text-white">{formatDate(slot.date)}</p>
                        <span className="text-xs text-slate-400">
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="border-white/10 text-slate-300 hover:bg-white/5"
            >
              Geri
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!selectedTheirSlot}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Devam Et
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — Summary */}
      {step === 3 && mySlotData && staffData && theirSlotData && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Takas Özeti</h3>
            <div className="flex items-center gap-4">
              {/* My Slot */}
              <div className="flex-1 rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <p className="text-xs text-blue-400 mb-1 font-medium">Sizin Nöbetiniz</p>
                <p className="text-sm font-semibold text-white">{formatDate(mySlotData.date)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatTime(mySlotData.start_time)} - {formatTime(mySlotData.end_time)}
                </p>
              </div>

              <ArrowRightLeft className="w-6 h-6 text-slate-500 flex-shrink-0" />

              {/* Their Slot */}
              <div className="flex-1 rounded-lg bg-violet-500/10 border border-violet-500/20 p-4">
                <p className="text-xs text-violet-400 mb-1 font-medium">{staffData.full_name}</p>
                <p className="text-sm font-semibold text-white">{formatDate(theirSlotData.date)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatTime(theirSlotData.start_time)} - {formatTime(theirSlotData.end_time)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="border-white/10 text-slate-300 hover:bg-white/5"
            >
              Geri
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Takas Talebi Gönder
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
