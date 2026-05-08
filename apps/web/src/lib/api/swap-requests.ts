import type {
  CreateSwapRequestInput,
  BaseResponse,
  SwapRequestListResponse,
  SwapRequestResponse,
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

// ─── Swap Request CRUD ───────────────────────────────────

/**
 * Kullanıcının takas taleplerini getirir
 * (gönderdiği + aldığı tüm talepler).
 */
export async function getSwapRequests(): Promise<SwapRequestListResponse> {
  return apiFetch<SwapRequestListResponse>('/api/swap-requests', {
    method: 'GET',
  })
}

/**
 * Yeni takas talebi oluşturur.
 */
export async function createSwapRequest(
  data: CreateSwapRequestInput
): Promise<SwapRequestResponse> {
  return apiFetch<SwapRequestResponse>('/api/swap-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Takas talebine yanıt verir.
 * action: 'accept' | 'reject' (receiver için)
 *         'approve' | 'reject' (admin için)
 */
export async function respondToSwapRequest(
  id: string,
  action: 'accept' | 'reject' | 'approve',
  rejectReason?: string
): Promise<BaseResponse> {
  return apiFetch<BaseResponse>(`/api/swap-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, rejectReason }),
  })
}
