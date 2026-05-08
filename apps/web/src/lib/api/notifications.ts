import type {
  BaseResponse,
  NotificationListResponse,
} from './types'

// ─── Yardımcı ─────────────────────────────────────────────

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

// ─── Notification İşlemleri ──────────────────────────────

/**
 * Kullanıcının bildirimlerini getirir (sayfalı).
 */
export async function getNotifications(
  page: number = 1,
  limit: number = 20
): Promise<NotificationListResponse> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))

  return apiFetch<NotificationListResponse>(
    `/api/notifications?${params.toString()}`,
    { method: 'GET' }
  )
}

/**
 * Tek bir bildirimi okundu işaretler.
 */
export async function markAsRead(id: string): Promise<BaseResponse> {
  return apiFetch<BaseResponse>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  })
}

/**
 * Tüm bildirimleri okundu işaretler.
 */
export async function markAllAsRead(): Promise<BaseResponse> {
  return apiFetch<BaseResponse>('/api/notifications/read-all', {
    method: 'PATCH',
  })
}
