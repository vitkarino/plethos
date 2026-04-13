import { getRouterParam, type H3Event } from 'h3'
import { z } from 'zod'
import { badRequest, unprocessable } from './errors'

const uuidSchema = z.string().uuid()

export function getRequiredRouterParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name)

  if (!value) {
    throw badRequest(`Missing route param: ${name}`)
  }

  return value
}

export function getUuidRouterParam(event: H3Event, name: string): string {
  const value = getRequiredRouterParam(event, name)
  const parsed = uuidSchema.safeParse(value)

  if (!parsed.success) {
    throw unprocessable(`Route param ${name} must be UUID`)
  }

  return parsed.data
}
