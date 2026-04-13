import { defineEventHandler, getHeader } from 'h3'

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api') && !event.path.startsWith('/ws')) {
    return
  }

  const authEnabled = process.env.AUTH_ENABLED === 'true'
  const authorization = getHeader(event, 'authorization')

  event.context.auth = {
    enabled: authEnabled,
    token: authorization ?? null,
    userId: null,
  }
})
