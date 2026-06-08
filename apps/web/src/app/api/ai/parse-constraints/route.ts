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
      .select('staff_id, start_date, end_date, profiles!leave_requests_staff_id_fkey(full_name)')
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

    // 5. Prompt yardımcı değişkenleri
    const staffListStr = staffList
      .map((s) => `- ${s.fullName}${s.titleName ? ` (${s.titleName})` : ''} (id: ${s.id})`)
      .join('\n')

    const leaveSection = leaveInfo.length > 0
      ? `\n\nDepartmandaki onaylı izinler:\n${leaveInfo.join('\n')}\n\nBu izinleri kullanıcı belirtmese bile otomatik olarak unavailable_date kısıtı olarak ekle.`
      : ''

    // Program tarihlerini önceden hesapla — prompt'a gömülecek
    // T12:00:00 + yerel bileşenler: UTC kaymasından bağımsız doğru tarihler
    const allProgramDates: string[] = []
    const cur = new Date(dateRange.start + 'T12:00:00')
    const endCur = new Date(dateRange.end + 'T12:00:00')
    while (cur <= endCur) {
      const y = cur.getFullYear()
      const mo = String(cur.getMonth() + 1).padStart(2, '0')
      const d  = String(cur.getDate()).padStart(2, '0')
      allProgramDates.push(`${y}-${mo}-${d}`)
      cur.setDate(cur.getDate() + 1)
    }
    const totalDays = allProgramDates.length

    // İlk N / son N tarih örneklerini göster (prompt token tasarrufu için maks 7)
    const first3 = allProgramDates.slice(0, 3).join(', ')
    const last3  = allProgramDates.slice(-3).join(', ')
    const first7 = allProgramDates.slice(0, 7).join(', ')
    const last7  = allProgramDates.slice(-7).join(', ')

    const systemPrompt = `Sen bir hastane/okul nöbet programı asistanısın.
Kullanıcının yazdığı Türkçe metni analiz edip JSON formatında kısıt listesine çevir.

Departmandaki personel listesi:
${staffListStr}

━━━ PROGRAM TARİH BİLGİLERİ ━━━
Program başlangıcı : ${dateRange.start}
Program bitişi     : ${dateRange.end}
Toplam gün sayısı  : ${totalDays} gün

İlk 3 günün tarihleri  : ${first3}
Son 3 günün tarihleri  : ${last3}
İlk 7 günün tarihleri  : ${first7}
Son 7 günün tarihleri  : ${last7}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${leaveSection}

Kullanıcı metni:
"${text}"

Şu kısıt tiplerini kullanabilirsin:
- max_shifts_per_month: { "max": number }
- max_shifts_per_week: { "max": number }
- max_hours_per_week: { "hours": number }
- unavailable_day: { "dayOfWeek": number[] } (0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi)
- unavailable_date: { "dates": string[] } (YYYY-MM-DD formatında, TEK bir günden fazla olabilir)
- min_rest_hours: { "hours": number }
- no_consecutive_days: { "days": number }
- must_together_shift: { "staffIds": string[] }
- not_together_shift: { "staffIds": string[] }
- min_staff_per_shift: { "min": number }
- max_staff_per_shift: { "max": number }
- required_on_date: { "dates": string[] } (Belirli bir tarihte/tarihlerde bu personelin kesinlikle nöbet tutması gerekiyorsa kullanılır)

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

━━━ TARİH ARALIĞI KURALLARI ━━━
"İlk N gün", "son N gün", "ilk hafta", "son hafta" gibi GÖRECELİ ifadeler için
yukarıdaki tarih listelerini kullan ve BÜTÜN günleri dates dizisine ekle.

Örnekler (program ${dateRange.start}–${dateRange.end} için):
• "ilk 3 gün"   → dates: [${first3}]  (3 tarih, hepsi eklenecek)
• "son 3 gün"   → dates: [${last3}]   (3 tarih, hepsi eklenecek)
• "ilk hafta"   → dates: [${first7}]  (7 tarih, hepsi eklenecek)
• "son hafta"   → dates: [${last7}]   (7 tarih, hepsi eklenecek)
• "ilk 2 gün"   → dates: [${allProgramDates.slice(0,2).join(', ')}]
• "son 2 gün"   → dates: [${allProgramDates.slice(-2).join(', ')}]

UYARI: "ilk 3 gün" derken yalnızca 1 tarih değil, tam olarak 3 tarih döndürülmeli!
Tarih sayısı kullanıcının söylediği sayıyla eşleşmeli.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Diğer örnekler:
"Ayşe 8 nöbet tutsun" → staffId: Ayşe'nin id'si, type: max_shifts_per_month, value: { "max": 8 }
"ilk nöbeti İsmail tutacak" → staffId: İsmail'in id'si, type: required_on_date, value: { "dates": ["${allProgramDates[0]}"] }
"Fatma Cuma günleri çalışmasın" → staffId: Fatma'nın id'si, type: unavailable_day, value: { "dayOfWeek": [5] }
"15-20 Ocak arası Ali'ye nöbet yazma" → staffId: Ali'nin id'si, type: unavailable_date, value: { "dates": ["2025-01-15","2025-01-16","2025-01-17","2025-01-18","2025-01-19","2025-01-20"] }
"Her vardiyada en az 2 kişi olsun" → staffId: null, type: min_staff_per_shift, value: { "min": 2 }
"Ayşe ve Fatma aynı anda nöbet tutmasın" → staffId: null, type: not_together_shift, value: { "staffIds": [ayşe_id, fatma_id] }

ÖNEMLİ KURALLAR:
- Personel adlarını listedeki isimlerle eşleştir. Bulamazsan unrecognized listesine ekle.
- staffId alanında mutlaka listedeki gerçek UUID'leri kullan.
- Tüm departman için geçerli olan kısıtlarda staffId: null olmalı.
- Her kısıt için anlaşılır bir Türkçe description yaz.
- unavailable_date kısıtında dates dizisi her zaman birden fazla gün içerebilir; eksik bırakma.`

    // 6. Gemini API çağrısı — önce mevcut modelleri keşfet, sonra sırayla dene
    const genAI = new GoogleGenerativeAI(apiKey)

    // 6a. Key'in erişebildiği modelleri listele
    const PREFER_PATTERNS = [
      'flash-lite', 'flash', 'pro-latest', 'pro',
    ]

    let candidateModels: string[] = []
    try {
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`
      )
      if (listRes.ok) {
        const listData = await listRes.json() as {
          models?: { name: string; supportedGenerationMethods?: string[] }[]
        }
        const allModels = (listData.models ?? [])
          .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m) => m.name.replace('models/', ''))

        // Tercih sırasına göre sırala: flash-lite → flash → pro-latest → pro → diğerleri
        candidateModels = [
          ...PREFER_PATTERNS.flatMap((pat) =>
            allModels.filter((n) => n.includes(pat))
          ),
          ...allModels.filter((n) => !PREFER_PATTERNS.some((pat) => n.includes(pat))),
        ]
        // Tekrar edenleri kaldır
        candidateModels = Array.from(new Set(candidateModels))
      }
    } catch {
      // ListModels başarısız olursa bilinen listeye dön
    }

    // ListModels çalışmadıysa sabit fallback listesi (1.5 ailesi bu key'de yok)
    if (candidateModels.length === 0) {
      candidateModels = [
        'gemini-2.0-flash-lite',   // en ucuz, hızlı
        'gemini-2.0-flash-lite-001',
        'gemini-2.0-flash',        // standart
        'gemini-2.0-flash-001',
        'gemini-2.5-flash',        // daha güçlü
        'gemini-flash-lite-latest',
        'gemini-flash-latest',
      ]
    }

    // 6b. Sırayla dene, 404/429 gelince sonrakine geç
    let responseText = ''
    let lastError: Error | null = null

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(systemPrompt)
        responseText = result.response.text()
        if (responseText && responseText.trim()) break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        const msg = lastError.message ?? ''
        if (!msg.includes('404') && !msg.includes('429')) throw lastError
        // 404 veya 429 → bir sonraki modeli dene
      }
    }

    if (!responseText || !responseText.trim()) {
      const errMsg = lastError?.message ?? 'Tüm modeller başarısız oldu'
      return NextResponse.json(
        {
          success: false,
          error: `AI yanıtı alınamadı: ${errMsg}`,
          hint: 'API key kotası dolmuş ya da bu key için hiçbir model erişilebilir değil.',
        },
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

    // 9. Çakışma ve uyarı kontrolü
    const warnings: string[] = []
    const finalConstraints: ParsedConstraint[] = []

    if (parsed.constraints) {
      for (const c of parsed.constraints) {
        if (c.type === 'required_on_date' && c.staffId) {
          const reqDates = (c.value as { dates?: string[] }).dates || []
          const staffLeaves = departmentLeaves.filter((l) => l.staff_id === c.staffId)
          const validDates: string[] = []

          for (const date of reqDates) {
            const reqDateObj = new Date(date)
            let isLeave = false
            for (const leave of staffLeaves) {
              const start = new Date(leave.start_date)
              const end = new Date(leave.end_date)
              if (reqDateObj >= start && reqDateObj <= end) {
                isLeave = true
                const staffName = getStaffName(leave.profiles) || c.staffName || 'Personel'
                warnings.push(
                  `${staffName} adlı personel ${date} tarihinde izinli olduğu için, o güne ait nöbet isteği İPTAL edildi.`
                )
              }
            }
            if (!isLeave) {
              validDates.push(date)
            }
          }

          if (validDates.length > 0) {
            finalConstraints.push({ ...c, value: { dates: validDates } })
          }
        } else {
          finalConstraints.push(c)
        }
      }
    }

    // 10. Audit log
    await supabase.from('audit_logs').insert({
      institution_id: profile.institution_id,
      user_id: profile.id,
      action: 'ai_parse_constraints',
      table_name: 'constraints',
      record_id: departmentId,
      new_value: {
        inputText: text.slice(0, 500),
        constraintCount: finalConstraints.length,
        autoConstraintCount: autoConstraints.length,
        unrecognizedCount: (parsed.unrecognized ?? []).length,
      },
    })

    return NextResponse.json({
      success: true,
      constraints: finalConstraints,
      autoConstraints,
      unrecognized: parsed.unrecognized ?? [],
      warnings,
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
