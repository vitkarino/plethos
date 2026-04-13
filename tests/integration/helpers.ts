import { expect } from 'vitest'

export async function expectApiError(
  request: () => Promise<unknown>,
  statusCode: number,
  errorCode?: string,
) {
  try {
    await request()
  } catch (error) {
    const responseStatus =
      (error as { response?: { status?: number } }).response?.status ??
      (error as { status?: number }).status ??
      (error as { statusCode?: number }).statusCode
    const body =
      (error as { data?: { error?: { code?: string } } }).data ??
      (error as { response?: { _data?: { error?: { code?: string } } } }).response?._data

    expect(responseStatus).toBe(statusCode)

    if (errorCode) {
      expect(body?.error?.code).toBe(errorCode)
    }

    return
  }

  throw new Error(`Expected request to fail with HTTP ${statusCode}`)
}
