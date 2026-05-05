import type {
  CreateDepartmentInput,
  BaseResponse,
  DepartmentListResponse,
  DepartmentResponse,
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

// ─── Department CRUD ──────────────────────────────────────

/**
 * Departman listesini getirir.
 */
export async function getDepartments(): Promise<DepartmentListResponse> {
  return apiFetch<DepartmentListResponse>('/api/departments', { method: 'GET' })
}

/**
 * Yeni departman oluşturur.
 */
export async function createDepartment(
  data: CreateDepartmentInput
): Promise<DepartmentResponse> {
  return apiFetch<DepartmentResponse>('/api/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Departman günceller.
 */
export async function updateDepartment(
  id: string,
  data: { name?: string; type?: string }
): Promise<DepartmentResponse> {
  return apiFetch<DepartmentResponse>(`/api/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Departmanı siler.
 */
export async function deleteDepartment(
  id: string
): Promise<BaseResponse> {
  return apiFetch<BaseResponse>(`/api/departments/${id}`, {
    method: 'DELETE',
  })
}
