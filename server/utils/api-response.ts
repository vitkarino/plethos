import { randomUUID } from 'node:crypto'
import { defineEventHandler, getHeader, setResponseStatus, type H3Event } from 'h3'
import type { ApiMeta, ApiPagination } from '../types/api'
import { normalizeError } from './errors'

const ROUTE_RESULT = Symbol('routeResult')

export interface RouteResult<T> {
  [ROUTE_RESULT]: true
  data: T
  statusCode: number
  pagination?: ApiPagination
}

interface RouteResultOptions {
  statusCode?: number
  pagination?: ApiPagination
}

export function routeResult<T>(data: T, options: RouteResultOptions = {}): RouteResult<T> {
  return {
    [ROUTE_RESULT]: true,
    data,
    statusCode: options.statusCode ?? 200,
    pagination: options.pagination,
  }
}

function isRouteResult<T>(value: unknown): value is RouteResult<T> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      ROUTE_RESULT in (value as Record<PropertyKey, unknown>),
  )
}

function createMeta(event: H3Event, pagination?: ApiPagination): ApiMeta {
  const requestId = event.context.requestId ?? getHeader(event, 'x-request-id') ?? randomUUID()

  return {
    requestId,
    timestamp: new Date().toISOString(),
    ...(pagination ? { pagination } : {}),
  }
}

export function defineApiHandler<T>(
  handler: (event: H3Event) => Promise<T | RouteResult<T>> | T | RouteResult<T>,
) {
  return defineEventHandler(async (event) => {
    try {
      const result = await handler(event)

      const normalized = isRouteResult<T>(result)
        ? result
        : routeResult(result as T, { statusCode: 200 })

      setResponseStatus(event, normalized.statusCode)

      return {
        data: normalized.data,
        meta: createMeta(event, normalized.pagination),
      }
    } catch (error) {
      const normalized = normalizeError(error)

      setResponseStatus(event, normalized.statusCode)

      return {
        error: {
          code: normalized.code,
          message: normalized.message,
          ...(normalized.details === undefined ? {} : { details: normalized.details }),
        },
        meta: createMeta(event),
      }
    }
  })
}
