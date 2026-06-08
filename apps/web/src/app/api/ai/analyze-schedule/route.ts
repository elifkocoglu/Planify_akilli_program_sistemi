import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { requireAuth, isAuthError } from '@/lib/api/auth-helpers'

/**
 * AI Destekli Program Analiz Endpoint'i
 * 
 * Bu endpoint Google Gemini 1.5 Flash modelini kullanarak
 * oluşturulan nöbet/ders programını analiz eder.
 * 
 * Analiz kapsamı:
 * - Personel bazlı adillik değerlendirmesi
 * - Kısıt ihlal tespiti
 * - Yük dengesi analizi
 * - Çözülemeyen slot analizi
 * - İyileştirme önerileri
 * 
 * Hibrit AI Mimarisi:
 * 1. NLP Katmanı: Doğal dil → kısıt dönüşümü
 * 2. Kısıt Motoru: Deterministik program üretimi
 * 3. Analiz Katmanı: AI destekli değerlendirme (bu endpoint)
 */

interface StaffItem {
  id: string
  fullName: string
  titleName?: string
}

interface ScheduleSlot {
  staffId: string | null
  date: string
  startTime: string
  endTime: string
}

interface UnresolvedSlot {
  date: string
  reason: string
}

interface ConstraintItem {
  staffId: string | null
  type: string
  value: Record<string, unknown>
}

interface RequestBody {
  scheduleId: string
  slots: ScheduleSlot[]
  unresolved: UnresolvedSlot[]
  warnings: string[]
  staffList: StaffItem[]
  constraints: ConstraintItem[]
  dateRange: {
    start: string
    end: string
  }
  scheduleType: 'duty' | 'lesson'
}

export async function POST(request: Request) {
  try {
    // 1. Auth kontrolü
    const auth = await requireAuth(['institution_admin', 'department_admin'])
    if (isAuthError(auth)) return auth
    const { supabase } = auth

    // 2. API key kontrolü
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API anahtarı yapılandırılmamış' },
        { status: 500 }
      )
    }

    // 3. Body parse
    const body: RequestBody = await request.json()
    const { scheduleId, slots, unresolved, warnings, staffList, constraints, dateRange, scheduleType } = body

    if (!scheduleId) {
      return NextResponse.json({ error: 'Program ID gerekli' }, { status: 400 })
    }

    // 4. Slot istatistiklerini hesapla
    const staffStats = staffList.map(staff => {
      const staffSlots = slots.filter(s => s.staffId === staff.id)
      const totalHours = staffSlots.reduce((acc, slot) => {
        const [sh, sm] = slot.startTime.split(':').map(Number)
        const [eh, em] = slot.endTime.split(':').map(Number)
        let diff = (eh * 60 + em) - (sh * 60 + sm)
        if (diff <= 0) diff += 24 * 60
        return acc + diff / 60
      }, 0)

      return {
        id: staff.id,
        fullName: staff.fullName,
        shiftCount: staffSlots.length,
        totalHours: Math.round(totalHours * 10) / 10,
        dates: staffSlots.map(s => s.date)
      }
    })

    const avgShifts = staffStats.length > 0 
      ? staffStats.reduce((acc, s) => acc + s.shiftCount, 0) / staffStats.length 
      : 0

    // 5. Gemini'ye gönderilecek prompt
    const prompt = `
Sen bir nöbet programı analiz uzmanısın.
Oluşturulan programı analiz edip 
Türkçe rapor hazırla.

Program bilgileri:
- Tip: ${scheduleType === 'duty' ? 'Nöbet' : 'Ders'}
- Tarih aralığı: ${dateRange.start} - ${dateRange.end}
- Toplam slot: ${slots.length}
- Çözülemeyen slot: ${unresolved.length}

Personel bazlı istatistikler:
${staffStats.map(s => `- ${s.fullName}: ${s.shiftCount} nöbet, ${s.totalHours} saat`).join('\n')}

Ortalama nöbet sayısı: ${avgShifts.toFixed(1)}

Çözülemeyen slotlar:
${unresolved.length > 0 ? unresolved.map(u => `- ${u.date}: ${u.reason}`).join('\n') : 'Yok'}

Uyarılar:
${warnings.length > 0 ? warnings.join('\n') : 'Yok'}

Uygulanan kısıtlar:
${constraints.map(c => `- ${c.type}: ${JSON.stringify(c.value)}`).join('\n')}

SADECE JSON döndür, markdown kullanma. Aşağıdaki yapıda olmalı:
{
  "overallScore": 0-100 arası puan,
  "scoreLabel": "Mükemmel/İyi/Orta/Zayıf",
  "summary": "2-3 cümle genel özet",
  "fairnessAnalysis": {
    "status": "adil" | "kısmen_adil" | "adaletsiz",
    "description": "Dağılım hakkında açıklama",
    "mostLoaded": "En fazla nöbet tutan kişi adı",
    "leastLoaded": "En az nöbet tutan kişi adı",
    "maxDifference": sayısal fark
  },
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "title": "Sorun başlığı",
      "description": "Detaylı açıklama",
      "affectedStaff": ["etkilenen personel adları"]
    }
  ],
  "suggestions": [
    {
      "title": "Öneri başlığı",
      "description": "Ne yapılmalı",
      "impact": "Beklenen etki"
    }
  ],
  "unresolvedAnalysis": "Çözülemeyen slotlar hakkında açıklama veya null",
  "positives": ["İyi olan şeyler listesi"]
}
`

    // 6. Gemini çağrısı
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    let responseText = result.response.text()

    let analysis
    try {
      if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }
      analysis = JSON.parse(responseText.trim())
    } catch {
      // JSON parse edilemezse basit bir fallback oluştur
      const sortedStats = [...staffStats].sort((a, b) => b.shiftCount - a.shiftCount)
      const most = sortedStats[0]
      const least = sortedStats[sortedStats.length - 1]
      
      analysis = {
        overallScore: unresolved.length > 0 ? 60 : 80,
        scoreLabel: unresolved.length > 0 ? "Orta" : "İyi",
        summary: "Program başarıyla oluşturuldu, ancak detaylı yapay zeka analizi işlenemedi.",
        fairnessAnalysis: {
          status: "kısmen_adil",
          description: "İstatistiklere dayalı temel görünüm.",
          mostLoaded: most?.fullName || "-",
          leastLoaded: least?.fullName || "-",
          maxDifference: most && least ? most.shiftCount - least.shiftCount : 0
        },
        issues: unresolved.length > 0 ? [{
          severity: "high",
          title: "Çözülemeyen Slotlar",
          description: "Bazı vardiyalara personel atanamadı.",
          affectedStaff: []
        }] : [],
        suggestions: [{
          title: "Manuel Kontrol",
          description: "Programı manuel olarak gözden geçirin.",
          impact: "Daha adil dağılım"
        }],
        unresolvedAnalysis: unresolved.length > 0 ? "Belirtilen günlerde personel yetersizliği tespit edildi." : null,
        positives: ["Sistem çalıştı"]
      }
    }

    // 7. Analizi veritabanına kaydet
    await supabase
      .from('schedules')
      .update({ 
        settings: { 
          aiAnalysis: analysis,
          analyzedAt: new Date().toISOString()
        }
      })
      .eq('id', scheduleId)

    return NextResponse.json({ 
      success: true, 
      analysis,
      staffStats 
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { error: `AI analizi yapılamadı: ${message}` },
      { status: 500 }
    )
  }
}
