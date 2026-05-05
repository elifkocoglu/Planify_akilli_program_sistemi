import type {
  StaffFilters,
  UpdateStaffInput,
  BaseResponse,
  StaffListResponse,
  StaffDetailResponse,
  StaffResponse,
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

// ─── Staff CRUD ───────────────────────────────────────────

/**
 * Personel listesini getirir.
 */
export async function getStaffList(
  filters?: StaffFilters
): Promise<StaffListResponse> {
  const params = new URLSearchParams()
  if (filters?.departmentId) params.set('departmentId', filters.departmentId)
  if (filters?.role) params.set('role', filters.role)
  if (filters?.isActive) params.set('isActive', filters.isActive)
  if (filters?.search) params.set('search', filters.search)

  const query = params.toString()
  const url = `/api/staff${query ? `?${query}` : ''}`
  return apiFetch<StaffListResponse>(url, { method: 'GET' })
}

/**
 * Tek bir personelin detayını getirir.
 */
export async function getStaffDetail(
  id: string
): Promise<StaffDetailResponse> {
  return apiFetch<StaffDetailResponse>(`/api/staff/${id}`, { method: 'GET' })
}

/**
 * Personel bilgilerini günceller.
 */
export async function updateStaff(
  id: string,
  data: UpdateStaffInput
): Promise<StaffResponse> {
  return apiFetch<StaffResponse>(`/api/staff/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Personeli aktif/pasif yapar.
 */
export async function toggleStaffStatus(
  id: string,
  isActive: boolean
): Promise<StaffResponse> {
  return apiFetch<StaffResponse>(`/api/staff/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })
}
