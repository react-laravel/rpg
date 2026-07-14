export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  data?: T
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
let csrfPromise: Promise<void> | null = null

function cookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

async function ensureCsrfCookie(force = false): Promise<void> {
  if (typeof window === 'undefined') return
  if (!force && cookie('XSRF-TOKEN')) return

  csrfPromise ??= fetch('/sanctum/csrf-cookie', {
    credentials: 'include',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  })
    .then(response => {
      if (!response.ok) throw new Error('无法初始化安全会话')
    })
    .finally(() => {
      csrfPromise = null
    })

  await csrfPromise
}

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    ('success' in payload || 'message' in payload)
  ) {
    return (payload as ApiEnvelope<T>).data as T
  }
  return payload as T
}

async function parseError(response: Response): Promise<ApiError> {
  let details: unknown
  let message = `请求失败 (${response.status})`
  try {
    details = await response.json()
    if (details && typeof details === 'object' && 'message' in details) {
      message = String((details as { message?: unknown }).message || message)
    }
  } catch {
    // 非 JSON 错误响应沿用状态码消息。
  }
  return new ApiError(message, response.status, details)
}

export async function apiRequest<T>(
  endpoint: string,
  method = 'GET',
  data?: unknown,
  options: { suppressUnauthorizedRedirect?: boolean } = {}
): Promise<T> {
  const normalizedMethod = method.toUpperCase()
  const normalizedEndpoint = endpoint.replace(/^\/+/, '')

  if (!SAFE_METHODS.has(normalizedMethod)) await ensureCsrfCookie()

  const execute = () => {
    const headers = new Headers({
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    })
    const isFormData = data instanceof FormData
    if (!isFormData && data !== undefined) headers.set('Content-Type', 'application/json')
    const xsrf = cookie('XSRF-TOKEN')
    if (!SAFE_METHODS.has(normalizedMethod) && xsrf) headers.set('X-XSRF-TOKEN', xsrf)

    return fetch(`/api/${normalizedEndpoint}`, {
      method: normalizedMethod,
      credentials: 'include',
      headers,
      body:
        data === undefined || SAFE_METHODS.has(normalizedMethod)
          ? undefined
          : isFormData
            ? data
            : JSON.stringify(data),
    })
  }

  let response = await execute()
  if (response.status === 419 && !SAFE_METHODS.has(normalizedMethod)) {
    await ensureCsrfCookie(true)
    response = await execute()
  }

  if (!response.ok) {
    const error = await parseError(response)
    if (error.status === 401 && !options.suppressUnauthorizedRedirect && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('rpg:unauthorized'))
    }
    throw error
  }

  if (response.status === 204) return {} as T
  const text = await response.text()
  if (!text) return {} as T
  return unwrap<T>(JSON.parse(text) as T | ApiEnvelope<T>)
}

export const apiGet = <T = unknown>(endpoint: string) => apiRequest<T>(endpoint)
export const get = apiGet
export const post = <T = unknown>(endpoint: string, data?: unknown) =>
  apiRequest<T>(endpoint, 'POST', data)
export const put = <T = unknown>(endpoint: string, data?: unknown) =>
  apiRequest<T>(endpoint, 'PUT', data)
export const del = <T = unknown>(endpoint: string, data?: unknown) =>
  apiRequest<T>(endpoint, 'DELETE', data)

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase()
  if (!SAFE_METHODS.has(method)) await ensureCsrfCookie()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-Requested-With', 'XMLHttpRequest')
  const xsrf = cookie('XSRF-TOKEN')
  if (!SAFE_METHODS.has(method) && xsrf) headers.set('X-XSRF-TOKEN', xsrf)
  return fetch(input, { ...init, headers, credentials: 'include' })
}
