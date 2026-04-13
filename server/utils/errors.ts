import { ZodError } from 'zod'

interface ApiErrorOptions {
  statusCode: number
  code: string
  message: string
  details?: unknown
}

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown

  public constructor(options: ApiErrorOptions) {
    super(options.message)
    this.name = 'ApiError'
    this.statusCode = options.statusCode
    this.code = options.code
    this.details = options.details
  }
}

export function notFound(message: string, details?: unknown): ApiError {
  return new ApiError({
    statusCode: 404,
    code: 'NOT_FOUND',
    message,
    details,
  })
}

export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError({
    statusCode: 409,
    code: 'CONFLICT',
    message,
    details,
  })
}

export function unprocessable(message: string, details?: unknown): ApiError {
  return new ApiError({
    statusCode: 422,
    code: 'VALIDATION_ERROR',
    message,
    details,
  })
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError({
    statusCode: 400,
    code: 'BAD_REQUEST',
    message,
    details,
  })
}

export function upstreamError(message: string, details?: unknown): ApiError {
  return new ApiError({
    statusCode: 502,
    code: 'UPSTREAM_ERROR',
    message,
    details,
  })
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof ZodError) {
    return unprocessable('Validation failed', error.flatten())
  }

  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    const dbErrorCode = (error as { code: string }).code

    if (dbErrorCode === '23505') {
      return conflict('Entity already exists')
    }

    if (dbErrorCode === '23503') {
      return unprocessable('Referenced entity does not exist')
    }
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error'

  return new ApiError({
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message,
  })
}
