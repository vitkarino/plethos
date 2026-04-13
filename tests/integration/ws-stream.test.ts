import WebSocket from 'ws'
import { beforeAll, describe, expect, it } from 'vitest'
import { apiFetch, getApiBaseUrl } from './apiClient'
import { bootstrapIntegrationSuite } from './bootstrap'

const userId = '22222222-2222-4222-8222-222222222222'
const projectId = 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1'

function waitFor(predicate: () => boolean, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()

    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer)
        resolve()
        return
      }

      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer)
        reject(new Error('Timeout while waiting for condition'))
      }
    }, 100)
  })
}

describe('Recordings websocket smoke', () => {
  beforeAll(async () => {
    await bootstrapIntegrationSuite()
  })

  it('streams frames and emits done after stop', async () => {
    const started = await apiFetch('/api/recordings/start', {
      method: 'POST',
      body: {
        userId,
        projectId,
        signalType: 'ppg',
        sampleRate: 64,
      },
    })

    const recordingId = started.data.id

    const beforeStream = await apiFetch(`/api/recordings/${recordingId}`)
    expect(beforeStream.data.status).toBe('recording')

    const messages: Array<{ type: string; data?: unknown }> = []
    let socketClosed: { code: number; reason: string } | null = null
    let socketError: string | null = null
    const wsUrl = new URL(`/ws/recordings/${recordingId}/stream`, getApiBaseUrl())
      .toString()
      .replace(/^http/, 'ws')

    const socket = new WebSocket(wsUrl)

    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve())
      socket.once('error', (error) => reject(error))
    })

    socket.on('message', (buffer) => {
      try {
        messages.push(JSON.parse(buffer.toString()) as { type: string; data?: unknown })
      } catch {
        // ignore malformed frame
      }
    })

    socket.on('close', (code, reason) => {
      socketClosed = {
        code,
        reason: reason.toString(),
      }
    })

    socket.on('error', (error) => {
      socketError = error.message
    })

    await waitFor(
      () =>
        messages.filter((message) => message.type === 'recording.frame').length >= 3 ||
        Boolean(socketClosed) ||
        Boolean(socketError) ||
        messages.some((message) => message.type === 'error'),
      12_000,
    )

    const streamErrorMessage = messages.find((message) => message.type === 'error')

    if (streamErrorMessage) {
      throw new Error(`WS stream returned error payload: ${JSON.stringify(streamErrorMessage)}`)
    }

    if (socketError) {
      throw new Error(`WS socket error: ${socketError}`)
    }

    if (socketClosed && messages.filter((message) => message.type === 'recording.frame').length < 3) {
      throw new Error(
        `WS socket closed too early. code=${socketClosed.code}, reason=${socketClosed.reason}`,
      )
    }

    await apiFetch(`/api/recordings/${recordingId}/stop`, {
      method: 'POST',
    })

    await waitFor(() => messages.some((message) => message.type === 'recording.done'), 12_000)

    const frameCount = messages.filter((message) => message.type === 'recording.frame').length
    expect(frameCount).toBeGreaterThanOrEqual(3)

    const doneEvent = messages.find((message) => message.type === 'recording.done')
    expect(doneEvent).toBeDefined()

    socket.close()
  })
})
