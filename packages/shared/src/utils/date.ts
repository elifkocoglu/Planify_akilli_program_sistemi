/**
 * Timezone-safe tarih yardımcı fonksiyonları.
 * "YYYY-MM-DD" stringlerini UTC olarak DEĞİL local time olarak parse eder.
 * Böylece UTC+3 (Türkiye) gibi timezone'larda gün kayması olmaz.
 */

/**
 * "YYYY-MM-DD" formatındaki tarihi local time olarak parse eder.
 * new Date("2025-01-15") UTC parse eder → Türkiye'de 1 gün geri gidebilir.
 * Bu fonksiyon local time kullanır, kayma olmaz.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * "YYYY-MM-DD" formatındaki tarihe bir gün ekler.
 * Timezone dönüşümü olmadan local time üzerinde çalışır.
 */
export function addOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + 1)
  const ny = date.getFullYear()
  const nm = String(date.getMonth() + 1).padStart(2, '0')
  const nd = String(date.getDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

/**
 * Verilen tarih aralığındaki tüm günleri "YYYY-MM-DD" listesi olarak döndürür.
 * Local time kullanır, gün atlaması olmaz.
 */
export function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []

  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)

  const startDate = new Date(sy, sm - 1, sd)
  const endDate = new Date(ey, em - 1, ed)

  const current = new Date(startDate)

  while (current <= endDate) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    // Local time üzerinde bir gün ilerlet
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * "YYYY-MM-DD" formatındaki tarih için haftanın gününü döndürür.
 * 0=Pazar, 1=Pazartesi ... 6=Cumartesi
 * Local time kullanır, gün kayması olmaz.
 */
export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}
