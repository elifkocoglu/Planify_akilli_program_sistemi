import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'
import type { ParsedConstraint } from '@/lib/api/types'

// ─────────────────────────────────────────────────────────────
// POST /api/ai/parse-constraints — Gemini ile kısıt ayrıştırma
// ─────────────────────────────────────────────────────────────

interface StaffItem {
  id: string
  fullName: string
  titleName?: string
}

interface RequestBody {
  text: string
  staffList: StaffItem[]
  departmentId: string
  institutionId: string
  dateRange: { start: string; end: string }
}

export async function POST(request: Request) {
  try {
    // 1. Auth kontrolü
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { profile, supabase } = auth

    // 2. API key kontrolü
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API anahtarı yapılandırılmamış' },
        { status: 500 }
      )
    }

    // 3. Body parse
    const body: RequestBody = await request.json()
    const { text, staffList, departmentId, dateRange } = body

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Lütfen kısıtları açıklayan bir metin girin' },
        { status: 400 }
      )
    }

    if (!departmentId) {
      return NextResponse.json(
        { success: false, error: 'Departman bilgisi gerekli' },
        { status: 400 }
      )
    }

    // 4. Onaylı izinleri çek (tarih aralığına göre)
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('staff_id, start_date, end_date, profiles(full_name)')
      .eq('status', 'approved')
      .gte('end_date', dateRange.start)
      .lte('start_date', dateRange.end)

    // Filtreleme: Sadece bu departmandaki personelin izinlerini al
    const staffIds = new Set(staffList.map((s) => s.id))
    const departmentLeaves = (leaves ?? []).filter((l) => staffIds.has(l.staff_id))

    // İzin tarihlerini oluştur
    const getStaffName = (profiles: unknown): string => {
      if (!profiles) return 'Bilinmeyen'
      // Supabase join bazen dizi, bazen obje döner
      const p = Array.isArray(profiles) ? profiles[0] : profiles
      return (p as { full_name?: string })?.full_name ?? 'Bilinmeyen'
    }

    const leaveInfo = departmentLeaves.map((l) => {
      const staffName = getStaffName(l.profiles)
      return `- ${staffName}: ${l.start_date} — ${l.end_date} arası izinli`
    })

    // 5. Gemini prompt oluştur
    const staffListStr = staffList
      .map((s) => `- ${s.fullName}${s.titleName ? ` (${s.titleName})` : ''} (id: ${s.id})`)
      .join('\n')

    const leaveSection = leaveInfo.length > 0
      ? `\n\nDepartmandaki onaylı izinler:\n${leaveInfo.join('\n')}\n\nBu izinleri kullanıcı belirtmese bile otomatik olarak unavailable_date kısıtı olarak ekle.`
      : ''

    const systemPrompt = `Sen bir hastane/okul nöbet programı asistanısın.
Kullanıcının yazdığı Türkçe metni analiz edip JSON formatında kısıt listesine çevir.

Departmandaki personel listesi:
${staffListStr}

Program tarihi: ${dateRange.start} — ${dateRange.end}
${leaveSection}

Kullanıcı metni:
"${text}"

Şu kısıt tiplerini kullanabilirsin:
- max_shifts_per_month: { "max": number }
- max_shifts_per_week: { "max": number }
- max_hours_per_week: { "hours": number }
- unavailable_day: { "dayOfWeek": number[] } (0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi)
- unavailable_date: { "dates": string[] } (YYYY-MM-DD formatında)
- min_rest_hours: { "hours": number }
- no_consecutive_days: { "days": number }
- must_together_shift: { "staffIds": string[] }
- not_together_shift: { "staffIds": string[] }
- min_staff_per_shift: { "min": number }
- max_staff_per_shift: { "max": number }

SADECE JSON döndür, başka hiçbir şey yazma. Markdown kod bloğu kullanma.

Format:
{
  "constraints": [
    {
      "staffId": "uuid veya null (tüm departman için)",
      "staffName": "Personel adı (gösterim için)",
      "type": "constraint_type",
      "value": {},
      "description": "Türkçe açıklama (kullanıcıya gösterilecek)"
    }
  ],
  "unrecognized": ["anlaşılamayan ifadeler listesi"],
  "summary": "Kısa Türkçe özet"
}

Örnekler:
"Ayşe 8 nöbet tutsun" → staffId: Ayşe'nin id'si, type: max_shifts_per_month, value: { "max": 8 }
"Fatma Cuma günleri çalışmasın" → staffId: Fatma'nın id'si, type: unavailable_day, value: { "dayOfWeek": [5] }
"15-20 Ocak arası Ali'ye nöbet yazma" → staffId: Ali'nin id'si, type: unavailable_date, value: { "dates": ["2025-01-15","2025-01-16","2025-01-17","2025-01-18","2025-01-19","2025-01-20"] }
"Her vardiyada en az 2 kişi olsun" → staffId: null, type: min_staff_per_shift, value: { "min": 2 }
"Ayşe ve Fatma aynı anda nöbet tutmasın" → staffId: null, type: not_together_shift, value: { "staffIds": [ayşe_id, fatma_id] }

ÖNEMLİ KURALLAR:
- Personel adlarını listedeki isimlerle eşleştir. Bulamazsan unrecognized listesine ekle.
- staffId alanında mutlaka listedeki gerçek UUID'leri kullan.
- Tüm departman için geçerli olan kısıtlarda staffId: null olmalı.
- Her kısıt için anlaşılır bir Türkçe description yaz.`

    // 6. Gemini API çağrısı — birden fazla model alias'ı sırayla dene
    const genAI = new GoogleGenerativeAI(apiKey)

    const MODEL_FALLBACK_LIST = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-001',
      'gemini-1.5-pro-latest',
      'gemini-pro',
    ]

    let responseText = ''
    let lastError: Error | null = null

    for (const modelName of MODEL_FALLBACK_LIST) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(systemPrompt)
        responseText = result.response.text()
        if (responseText && responseText.trim()) break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        // 404 veya 429 → bir sonraki modeli dene; diğer hatalar → dur
        const msg = lastError.message ?? ''
        if (!msg.includes('404') && !msg.includes('429')) throw lastError
        // bir sonraki modele geç
      }
    }

    if (!responseText || !responseText.trim()) {
      const errMsg = lastError?.message ?? 'Tüm modeller başarısız oldu'
      return NextResponse.json(
        { success: false, error: `AI yanıtı alınamadı: ${errMsg}` },
        { status: 500 }
      )
    }

    // 7. JSON parse — olası markdown temizliği
    let cleanText = responseText.trim()
    // Markdown kod bloğu temizliği
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    let parsed: {
      constraints?: ParsedConstraint[]
      unrecognized?: string[]
      summary?: string
    }

    try {
      parsed = JSON.parse(cleanText)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'AI yanıtı JSON olarak işlenemedi. Lütfen metninizi daha açık yazıp tekrar deneyin.',
        },
        { status: 500 }
      )
    }

    // 8. İzin kayıtlarından otomatik kısıtlar oluştur
    const autoConstraints: ParsedConstraint[] = departmentLeaves.map((leave) => {
      const staffName = getStaffName(leave.profiles)

      // Tarih aralığındaki günleri hesapla
      const dates: string[] = []
      const current = new Date(leave.start_date)
      const end = new Date(leave.end_date)
      while (current <= end) {
        dates.push(current.toISOString().slice(0, 10))
        current.setDate(current.getDate() + 1)
      }

      return {
        staffId: leave.staff_id,
        staffName: staffName,
        type: 'unavailable_date',
        value: { dates },
        description: `${staffName}: ${leave.start_date} — ${leave.end_date} arası izinli (otomatik)`,
        isAuto: true,
      }
    })

    // 9. Audit log
    await supabase.from('audit_logs').insert({
      institution_id: profile.institution_id,
      user_id: profile.id,
      action: 'ai_parse_constraints',
      table_name: 'constraints',
      record_id: departmentId,
      new_value: {
        inputText: text.slice(0, 500),
        constraintCount: (parsed.constraints ?? []).length,
        autoConstraintCount: autoConstraints.length,
        unrecognizedCount: (parsed.unrecognized ?? []).length,
      },
    })

    return NextResponse.json({
      success: true,
      constraints: parsed.constraints ?? [],
      autoConstraints,
      unrecognized: parsed.unrecognized ?? [],
      summary: parsed.summary ?? '',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { success: false, error: `AI analiz hatası: ${message}` },
      { status: 500 }
    )
  }
}
