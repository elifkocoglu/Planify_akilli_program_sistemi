/**
 * Yardımcı fonksiyonlar — tarih, saat ve hafta hesaplamaları.
 * Sıfır dış bağımlılık, saf TypeScript.
 */

/**
 * "YYYY-MM-DD" formatındaki tarih için ISO hafta numarası döndürür.
 */
export function getWeekNumber(date: string): number {
  const d = new Date(date + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  )
}

/**
 * İki saat dizesi arasındaki süreyi dakika olarak hesaplar.
 * @param start "HH:MM"
 * @param end   "HH:MM"
 */
export function getShiftDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

/**
 * Verilen tarih aralığındaki tüm günleri "YYYY-MM-DD" listesi olarak döndürür.
 */
export function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

/**
 * "YYYY-MM-DD" formatındaki tarih için haftanın gününü döndürür.
 * 0=Pazar, 1=Pazartesi ... 6=Cumartesi
 */
export function getDayOfWeek(date: string): number {
  return new Date(date + 'T00:00:00').getDay()
}

/**
 * İki zaman aralığının çakışıp çakışmadığını kontrol eder.
 * @param start1 "HH:MM"
 * @param end1   "HH:MM"
 * @param start2 "HH:MM"
 * @param end2   "HH:MM"
 */
export function doTimesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const s1 = toMin(start1)
  const e1 = toMin(end1)
  const s2 = toMin(start2)
  const e2 = toMin(end2)
  return s1 < e2 && s2 < e1
}

/**
 * İki tarih-saat çifti arasındaki dakika farkını hesaplar.
 * @param date1 "YYYY-MM-DD"
 * @param time1 "HH:MM" (bitiş saati)
 * @param date2 "YYYY-MM-DD"
 * @param time2 "HH:MM" (başlangıç saati)
 */
export function getMinutesBetween(
  date1: string,
  time1: string,
  date2: string,
  time2: string
): number {
  const d1 = new Date(`${date1}T${time1}:00`)
  const d2 = new Date(`${date2}T${time2}:00`)
  return (d2.getTime() - d1.getTime()) / 60000
}
