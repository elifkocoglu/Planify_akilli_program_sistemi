/** Program takvimi slot tipi */
export interface ScheduleSlot {
  id: string
  scheduleId: string
  staffId: string
  departmentId: string
  roomId?: string
  titleId?: string
  /** "YYYY-MM-DD" formatında tarih */
  date: string
  /** 0=Pazar, 1=Pazartesi ... 6=Cumartesi */
  dayOfWeek: number
  /** "HH:MM" formatında başlangıç saati */
  startTime: string
  /** "HH:MM" formatında bitiş saati */
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
