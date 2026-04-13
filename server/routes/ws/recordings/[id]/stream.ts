import { defineWebSocketHandler } from 'h3'
import { useServices } from '../../../../services/container'
import { normalizeError } from '../../../../utils/errors'

const sessions = new WeakMap<object, { stop: () => void }>()

function resolveRecordingId(peer: {
  request?: { url?: string }
  websocket?: { url?: string }
}): string {
  const rawUrl = peer.request?.url ?? peer.websocket?.url ?? ''
  const pathname = (() => {
    if (!rawUrl) {
      return ''
    }

    try {
      return new URL(rawUrl, 'http://localhost').pathname
    } catch {
      return rawUrl
    }
  })()

  const match = pathname.match(/\/ws\/recordings\/([0-9a-fA-F-]{36})\/stream\/?$/)

  if (!match) {
    throw new Error('Missing recording id in websocket path')
  }

  return match[1]
}

function safeSend(peer: { send: (payload: string) => void }, payload: Record<string, unknown>) {
  try {
    peer.send(JSON.stringify(payload))
  } catch {
    // noop
  }
}

export default defineWebSocketHandler({
  async open(peer) {
    try {
      const recordingId = resolveRecordingId(peer)

      const session = await useServices().recordingsService.streamRecording(recordingId, {
        onFrame: (frame) => {
          safeSend(peer, {
            type: 'recording.frame',
            data: frame,
          })
        },
        onState: (state) => {
          safeSend(peer, {
            type: 'recording.state',
            data: state,
          })
        },
        onDone: (payload) => {
          safeSend(peer, {
            type: 'recording.done',
            data: payload,
          })

          peer.close(1000, payload.reason)
        },
        onError: (error) => {
          safeSend(peer, {
            type: 'error',
            error: error.message,
          })

          peer.close(1011, 'stream_error')
        },
      })

      sessions.set(peer as unknown as object, session)
    } catch (error) {
      const normalized = normalizeError(error)

      safeSend(peer, {
        type: 'error',
        error: normalized.message,
      })

      peer.close(1008, normalized.code)
    }
  },

  close(peer) {
    sessions.get(peer as unknown as object)?.stop()
    sessions.delete(peer as unknown as object)
  },

  error(peer, error) {
    const normalized = normalizeError(error)

    safeSend(peer, {
      type: 'error',
      error: normalized.message,
    })

    sessions.get(peer as unknown as object)?.stop()
    sessions.delete(peer as unknown as object)
  },
})
