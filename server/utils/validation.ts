import { readBody, type H3Event } from 'h3'
import type { ZodType } from 'zod'
import { unprocessable } from './errors'

export async function parseValidatedBody<T>(
  event: H3Event,
  schema: ZodType<T>,
): Promise<T> {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw unprocessable('Invalid request body', parsed.error.flatten())
  }

  return parsed.data
}

export function parseValidatedQuery<T>(query: unknown, schema: ZodType<T>): T {
  const parsed = schema.safeParse(query)

  if (!parsed.success) {
    throw unprocessable('Invalid query params', parsed.error.flatten())
  }

  return parsed.data
}
