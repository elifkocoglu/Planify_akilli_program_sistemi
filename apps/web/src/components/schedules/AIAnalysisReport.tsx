import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  Scale,
  ThumbsUp,
  AlertOctagon
} from 'lucide-react'

interface StaffStat {
  id: string
  fullName: string
  shiftCount: number
  totalHours: number
}

interface AnalysisIssue {
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  affectedStaff: string[]
}

interface AnalysisSuggestion {
  title: string
  description: string
  impact: string
}

interface AIAnalysis {
  overallScore: number
  scoreLabel: string
  summary: string
  fairnessAnalysis: {
    status: 'adil' | 'kısmen_adil' | 'adaletsiz'
    description: string
    mostLoaded: string
    leastLoaded: string
    maxDifference: number
  }
  issues: AnalysisIssue[]
  suggestions: AnalysisSuggestion[]
  unresolvedAnalysis: string | null
  positives: string[]
}

interface AIAnalysisReportProps {
  analysis: AIAnalysis
  staffStats: StaffStat[]
  unresolvedCount: number
}

export function AIAnalysisReport({ analysis, staffStats, unresolvedCount }: AIAnalysisReportProps) {
  // Score color logic
  let scoreColor = 'text-emerald-500'
  let scoreRing = 'ring-emerald-500/20'
  let scoreBg = 'bg-emerald-500/10'

  if (analysis.overallScore < 40) {
    scoreColor = 'text-red-500'
    scoreRing = 'ring-red-500/20'
    scoreBg = 'bg-red-500/10'
  } else if (analysis.overallScore < 60) {
    scoreColor = 'text-orange-500'
    scoreRing = 'ring-orange-500/20'
    scoreBg = 'bg-orange-500/10'
  } else if (analysis.overallScore < 80) {
    scoreColor = 'text-amber-500'
    scoreRing = 'ring-amber-500/20'
    scoreBg = 'bg-amber-500/10'
  }

  // Calculate average for badges
  const avgShifts = staffStats.length > 0 
    ? staffStats.reduce((acc, s) => acc + s.shiftCount, 0) / staffStats.length 
    : 0

  return (
    <div className="space-y-6">
      {/* ÜST KISIM: Genel Skor ve Özet */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className={`shrink-0 flex flex-col items-center justify-center w-32 h-32 rounded-full border-[6px] ${scoreRing} ${scoreBg}`}>
          <span className={`text-4xl font-bold ${scoreColor}`}>{analysis.overallScore}</span>
          <span className="text-sm font-medium text-slate-300 mt-1">{analysis.scoreLabel}</span>
        </div>
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <h3 className="text-xl font-semibold text-white">Yapay Zeka Analiz Özeti</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{analysis.summary}</p>
        </div>
      </div>

      {/* ORTA KISIM: 4 Kart (2x2 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Kart 1: Adillik Analizi */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-400" />
              Adillik Analizi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Durum:</span>
              <Badge variant="outline" className={
                analysis.fairnessAnalysis.status === 'adil' ? 'text-emerald-400 border-emerald-500/30' :
                analysis.fairnessAnalysis.status === 'kısmen_adil' ? 'text-amber-400 border-amber-500/30' :
                'text-red-400 border-red-500/30'
              }>
                {analysis.fairnessAnalysis.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">En Fazla Nöbet:</span>
                <span className="font-medium text-white">{analysis.fairnessAnalysis.mostLoaded || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">En Az Nöbet:</span>
                <span className="font-medium text-white">{analysis.fairnessAnalysis.leastLoaded || '-'}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400">Maksimum Fark:</span>
                <span className="font-medium text-white">{analysis.fairnessAnalysis.maxDifference} nöbet</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{analysis.fairnessAnalysis.description}</p>
          </CardContent>
        </Card>

        {/* Kart 2: Sorunlar */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              Sorunlar ve Uyarılar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.issues.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Herhangi bir sorun tespit edilmedi.</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {analysis.issues.map((issue, idx) => (
                  <li key={idx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-white/10 ${
                        issue.severity === 'high' ? 'bg-red-500/20 text-red-300' :
                        issue.severity === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium text-slate-200">{issue.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 ml-1">{issue.description}</p>
                    {issue.affectedStaff && issue.affectedStaff.length > 0 && (
                      <p className="text-[10px] text-slate-500 ml-1">Etkilenenler: {issue.affectedStaff.join(', ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Kart 3: Öneriler */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              İyileştirme Önerileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.suggestions.length === 0 ? (
              <p className="text-sm text-slate-400">Şu an için bir öneri bulunmuyor.</p>
            ) : (
              <ul className="space-y-3">
                {analysis.suggestions.map((sug, idx) => (
                  <li key={idx} className="flex gap-2 items-start">
                    <Info className="h-4 w-4 text-amber-500/70 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-slate-200 block">{sug.title}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">{sug.description}</span>
                      <span className="text-[10px] text-emerald-400/80 block mt-1">Etki: {sug.impact}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Kart 4: Olumlu Noktalar */}
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-emerald-400" />
              Olumlu Noktalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.positives.length === 0 ? (
              <p className="text-sm text-slate-400">-</p>
            ) : (
              <ul className="space-y-2">
                {analysis.positives.map((pos, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500/70 shrink-0" />
                    <span>{pos}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Çözülemeyen Slot Uyarısı */}
      {unresolvedCount > 0 && (
        <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-4 flex items-start gap-3">
          <AlertOctagon className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-orange-400">
              {unresolvedCount} adet vardiyaya personel atanamadı!
            </h4>
            {analysis.unresolvedAnalysis && (
              <p className="text-sm text-orange-300/80 mt-1">{analysis.unresolvedAnalysis}</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Programı kaydedip daha sonra bu slotlara manuel atama yapabilirsiniz.
            </p>
          </div>
        </div>
      )}

      {/* ALT KISIM: Personel Dağılım Tablosu */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">Personel Yük Dağılımı</h3>
          <p className="text-xs text-slate-400 mt-1">Ortalama nöbet sayısı: {avgShifts.toFixed(1)}</p>
        </div>
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-slate-400">Ad Soyad</TableHead>
              <TableHead className="text-slate-400 text-right">Nöbet Sayısı</TableHead>
              <TableHead className="text-slate-400 text-right">Toplam Saat</TableHead>
              <TableHead className="text-slate-400 w-24">Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffStats.length === 0 ? (
              <TableRow className="border-white/10 hover:bg-white/[0.02]">
                <TableCell colSpan={4} className="text-center text-slate-500 py-6">
                  Personel verisi bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              staffStats.map(staff => {
                const isHigh = staff.shiftCount >= avgShifts + 1.5;
                const isLow = staff.shiftCount <= avgShifts - 1.5;
                
                return (
                  <TableRow key={staff.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="font-medium text-slate-300">{staff.fullName}</TableCell>
                    <TableCell className="text-right text-slate-400">{staff.shiftCount}</TableCell>
                    <TableCell className="text-right text-slate-400">{staff.totalHours}</TableCell>
                    <TableCell>
                      {isHigh ? (
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">Yüklü</Badge>
                      ) : isLow ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">Az</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Normal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  )
}
