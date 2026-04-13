const globalIntegration = globalThis as typeof globalThis & {
  __pulsoApiBaseUrl?: string
}

export function getApiBaseUrl(): string {
  const value = globalIntegration.__pulsoApiBaseUrl

  if (!value) {
    throw new Error('Integration API base URL is not initialized')
  }

  return value
}

function normalizeRequestInit(options?: RequestInit & { body?: unknown }): RequestInit {
  if (!options) {
    return {}
  }

  const { body, headers, ...rest } = options

  if (body === undefined) {
    return { headers, ...rest }
  }

  if (typeof body === 'string' || body instanceof FormData || body instanceof URLSearchParams) {
    return {
      ...rest,
      headers,
      body,
    }
  }

  return {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit & { body?: unknown },
): Promise<T> {
  const absoluteUrl = new URL(path, getApiBaseUrl()).toString()
  const response = await fetch(absoluteUrl, normalizeRequestInit(options))

  const text = await response.text()
  const parsed = text ? (JSON.parse(text) as T) : (null as T)

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as Error & {
      status: number
      statusCode: number
      response: { status: number; _data: unknown }
      data: unknown
    }

    error.status = response.status
    error.statusCode = response.status
    error.response = {
      status: response.status,
      _data: parsed,
    }
    error.data = parsed

    throw error
  }

  return parsed
}
