import type {
  CreateTitleInput,
  BaseResponse,
  TitleListResponse,
  TitleResponse,
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

// ─── Title CRUD ───────────────────────────────────────────

/**
 * Unvan listesini getirir.
 */
export async function getTitles(): Promise<TitleListResponse> {
  return apiFetch<TitleListResponse>('/api/titles', { method: 'GET' })
}

/**
 * Yeni unvan oluşturur.
 */
export async function createTitle(
  data: CreateTitleInput
): Promise<TitleResponse> {
  return apiFetch<TitleResponse>('/api/titles', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Unvan günceller.
 */
export async function updateTitle(
  id: string,
  data: { name?: string; minRequiredPerShift?: number }
): Promise<TitleResponse> {
  return apiFetch<TitleResponse>(`/api/titles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Unvanı siler.
 */
export async function deleteTitle(
  id: string
): Promise<BaseResponse> {
  return apiFetch<BaseResponse>(`/api/titles/${id}`, {
    method: 'DELETE',
  })
}
