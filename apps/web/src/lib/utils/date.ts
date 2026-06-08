/**
 * Web tarafı timezone-safe tarih yardımcı fonksiyonları.
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
 * Türkçe tam tarih formatı: "15 Ocak 2025"
 */
export function formatTurkishDate(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Türkçe gün adı: "Çarşamba"
 */
export function formatTurkishDayName(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('tr-TR', { weekday: 'long' })
}
