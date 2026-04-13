import { randomUUID } from 'node:crypto'
import { defineEventHandler, getHeader } from 'h3'

export default defineEventHandler((event) => {
  event.context.requestId = getHeader(event, 'x-request-id') ?? randomUUID()
})
