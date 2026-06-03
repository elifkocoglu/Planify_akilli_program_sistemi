/** Program takvimi slot tipi */
export interface ScheduleSlot {
  id: string
  scheduleId: string
  staffId: string
  departmentId: string
  roomId?: string
  titleId?: string
  /** "YYYY-MM-DD" formatında başlangıç tarihi */
  date: string
  /**
   * "YYYY-MM-DD" formatında bitiş tarihi.
   * 24 saati aşan nöbetlerde (örn. 09:00-09:00 ertesi gün)
   * date'den farklı olabilir. Verilmezse date ile aynı kabul edilir.
   */
  endDate?: string
  /** 0=Pazar, 1=Pazartesi ... 6=Cumartesi */
  dayOfWeek: number
  /** "HH:MM" formatında başlangıç saati */
  startTime: string
  /** "HH:MM" formatında bitiş saati (gece yarısını geçerse 00:00-23:59 aralığında kalır) */
  endTime: string
  status: 'active' | 'swapped' | 'cancelled'
}

/** Personel bilgisi */
export interface StaffMember {
  id: string
  fullName: string
  titleId?: string
  departmentId: string
  weeklyMaxHours?: number
  monthlyMaxShifts?: number
}

/** Oda/sınıf bilgisi */
export interface Room {
  id: string
  name: string
  capacity?: number
}
