import type {
  CreateLeaveRequestInput,
  BaseResponse,
  LeaveRequestListResponse,
  LeaveRequestResponse,
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

// ─── Leave Request CRUD ──────────────────────────────────

/**
 * Kullanıcının izin taleplerini getirir.
 * Opsiyonel status filtresi destekler.
 */
export async function getLeaveRequests(
  status?: string
): Promise<LeaveRequestListResponse> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)

  const query = params.toString()
  const url = `/api/leave-requests${query ? `?${query}` : ''}`

  return apiFetch<LeaveRequestListResponse>(url, { method: 'GET' })
}

/**
 * Yeni izin talebi oluşturur.
 */
export async function createLeaveRequest(
  data: CreateLeaveRequestInput
): Promise<LeaveRequestResponse> {
  return apiFetch<LeaveRequestResponse>('/api/leave-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Pending izin talebini iptal eder (staff kendi talebi için).
 */
export async function cancelLeaveRequest(
  id: string
): Promise<BaseResponse> {
  return apiFetch<BaseResponse>(`/api/leave-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'cancel' }),
  })
}
