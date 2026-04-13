import { getQuery, type H3Event } from 'h3'
import { z } from 'zod'
import { parseValidatedQuery } from './validation'

const paginationSchema = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  offset: z
    .coerce
    .number()
    .int()
    .min(0)
    .default(0),
})

export interface PaginationInput {
  limit: number
  offset: number
}

export function getPagination(event: H3Event): PaginationInput {
  const query = getQuery(event)
  return parseValidatedQuery(query, paginationSchema)
}
