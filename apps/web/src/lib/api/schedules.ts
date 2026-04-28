import type {
  CreateScheduleInput,
  GenerateScheduleInput,
  ScheduleFilters,
  SlotInput,
  BaseResponse,
  ScheduleResponse,
  ScheduleListResponse,
  ScheduleDetailResponse,
  GenerateResponse,
  SlotResponse,
  PublishResponse,
} from './types'

// ─── Yardımcı ─────────────────────────────────────────────

/**
 * API isteği gönderir ve response'u parse eder.
 * Hata durumunda fırlatır.
 */
async function apiFetch<T extends BaseResponse>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const data: T = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? `İstek başarısız (HTTP ${response.status})`)
  }

  return data
}

// ─── Schedule CRUD ────────────────────────────────────────

/**
 * Yeni taslak schedule oluşturur.
 */
export async function createSchedule(
  data: CreateScheduleInput
): Promise<ScheduleResponse> {
  return apiFetch<ScheduleResponse>('/api/schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Schedule listesini getirir.
 * Role göre otomatik filtrelenir.
 */
export async function getSchedules(
  filters?: ScheduleFilters
): Promise<ScheduleListResponse> {
  const params = new URLSearchParams()
  if (filters?.departmentId) params.set('departmentId', filters.departmentId)
  if (filters?.status) params.set('status', filters.status)

  const query = params.toString()
  const url = `/api/schedules${query ? `?${query}` : ''}`

  return apiFetch<ScheduleListResponse>(url, { method: 'GET' })
}

/**
 * Tek bir schedule'ın detayını ve slotlarını getirir.
 */
export async function getSchedule(
  id: string
): Promise<ScheduleDetailResponse> {
  return apiFetch<ScheduleDetailResponse>(`/api/schedules/${id}`, {
    method: 'GET',
  })
}

/**
 * Schedule bilgilerini günceller (title, status).
 */
export async function updateSchedule(
  id: string,
  data: { title?: string; status?: string }
): Promise<ScheduleResponse> {
  return apiFetch<ScheduleResponse>(`/api/schedules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Taslak schedule'ı siler.
 */
export async function deleteSchedule(id: string): Promise<BaseResponse> {
  return apiFetch<BaseResponse>(`/api/schedules/${id}`, {
    method: 'DELETE',
  })
}

// ─── Program Üretici ──────────────────────────────────────

/**
 * Otomatik program üretir.
 * @planify/shared generateSchedule() sunucu tarafında çalışır.
 */
export async function generateScheduleAPI(
  data: GenerateScheduleInput
): Promise<GenerateResponse> {
  return apiFetch<GenerateResponse>('/api/schedules/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Publish ──────────────────────────────────────────────

/**
 * Schedule'ı yayınlar ve departman personeline bildirim gönderir.
 */
export async function publishSchedule(
  id: string
): Promise<PublishResponse> {
  return apiFetch<PublishResponse>(`/api/schedules/${id}/publish`, {
    method: 'POST',
  })
}

// ─── Slot Yönetimi ────────────────────────────────────────

/**
 * Schedule'a manuel slot ekler.
 * Kısıt ihlali varsa hata fırlatır.
 */
export async function addSlot(
  scheduleId: string,
  data: SlotInput
): Promise<SlotResponse> {
  return apiFetch<SlotResponse>(`/api/schedules/${scheduleId}/slots`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Mevcut slotu günceller.
 * Güncelleme öncesi kısıt kontrolü yapılır.
 */
export async function updateSlot(
  scheduleId: string,
  slotId: string,
  data: Partial<SlotInput>
): Promise<SlotResponse> {
  return apiFetch<SlotResponse>(
    `/api/schedules/${scheduleId}/slots/${slotId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  )
}

/**
 * Slotu siler (soft delete: status → 'cancelled').
 */
export async function deleteSlot(
  scheduleId: string,
  slotId: string
): Promise<BaseResponse> {
  return apiFetch<BaseResponse>(
    `/api/schedules/${scheduleId}/slots/${slotId}`,
    {
      method: 'DELETE',
    }
  )
}
