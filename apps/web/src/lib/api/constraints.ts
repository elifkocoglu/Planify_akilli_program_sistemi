import type {
  ConstraintFilters,
  CreateConstraintInput,
  BaseResponse,
  ConstraintListResponse,
  ConstraintResponse,
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

// ─── Constraint CRUD ──────────────────────────────────────

/**
 * Kısıt listesini getirir.
 */
export async function getConstraints(
  filters?: ConstraintFilters
): Promise<ConstraintListResponse> {
  const params = new URLSearchParams()
  if (filters?.type) params.set('type', filters.type)
  if (filters?.staffId) params.set('staffId', filters.staffId)
  if (filters?.departmentId) params.set('departmentId', filters.departmentId)
  if (filters?.isActive) params.set('isActive', filters.isActive)

  const query = params.toString()
  const url = `/api/constraints${query ? `?${query}` : ''}`
  return apiFetch<ConstraintListResponse>(url, { method: 'GET' })
}

/**
 * Yeni kısıt oluşturur.
 */
export async function createConstraint(
  data: CreateConstraintInput
): Promise<ConstraintResponse> {
  return apiFetch<ConstraintResponse>('/api/constraints', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Kısıt günceller (is_active veya value).
 */
export async function updateConstraint(
  id: string,
  data: { is_active?: boolean; value?: Record<string, unknown> }
): Promise<ConstraintResponse> {
  return apiFetch<ConstraintResponse>(`/api/constraints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Kısıtı siler.
 */
export async function deleteConstraint(
  id: string
): Promise<BaseResponse> {
  return apiFetch<BaseResponse>(`/api/constraints/${id}`, {
    method: 'DELETE',
  })
}
