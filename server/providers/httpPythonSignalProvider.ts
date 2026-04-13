import { upstreamError } from '../utils/errors'
import type {
  ExtractRecordingInput,
  ExtractRecordingResult,
  SignalProvider,
  StartRecordingInput,
  StartRecordingResult,
  StopRecordingInput,
  StopRecordingResult,
  StreamRecordingInput,
  StreamSession,
} from './signalProvider'

interface HttpProviderConfig {
  baseUrl: string
  timeoutMs: number
}

function parseFinishedAt(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  throw upstreamError('Python provider returned invalid finishedAt')
}

function parseSamples(value: unknown): number[] {
  if (!Array.isArray(value) || value.some((sample) => typeof sample !== 'number')) {
    throw upstreamError('Python provider returned invalid samples payload')
  }

  return value
}

export class HttpPythonSignalProvider implements SignalProvider {
  private readonly baseUrl: string

  private readonly timeoutMs: number

  public constructor(config: HttpProviderConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.timeoutMs = config.timeoutMs
  }

  public async startRecording(input: StartRecordingInput): Promise<StartRecordingResult> {
    return this.request('/recordings/start', {
      method: 'POST',
      body: JSON.stringify({
        recordingId: input.recordingId,
        userId: input.userId,
        projectId: input.projectId,
        signalType: input.signalType,
        sampleRate: input.sampleRate,
        startedAt: input.startedAt.toISOString(),
      }),
    })
  }

  public async stopRecording(input: StopRecordingInput): Promise<StopRecordingResult> {
    const payload = await this.request<{
      finishedAt: unknown
      samples: unknown
      providerData?: Record<string, unknown>
    }>(`/recordings/${input.recording.id}/stop`, {
      method: 'POST',
      body: JSON.stringify({
        startedAt: input.recording.startedAt.toISOString(),
        sampleRate: input.recording.sampleRate,
        signalType: input.recording.signalType,
      }),
    })

    return {
      finishedAt: parseFinishedAt(payload.finishedAt),
      samples: parseSamples(payload.samples),
      ...(payload.providerData ? { providerData: payload.providerData } : {}),
    }
  }

  public async extractRecording(input: ExtractRecordingInput): Promise<ExtractRecordingResult> {
    return this.request(`/recordings/${input.recording.id}/extract`, {
      method: 'POST',
      body: JSON.stringify({
        samples: input.recording.rawData?.samples ?? [],
        sampleRate: input.recording.sampleRate,
        signalType: input.recording.signalType,
      }),
    })
  }

  public streamRecording(input: StreamRecordingInput): StreamSession {
    if (typeof WebSocket === 'undefined') {
      throw upstreamError('WebSocket is not available in current runtime')
    }

    const wsBase = this.baseUrl.startsWith('https://')
      ? this.baseUrl.replace('https://', 'wss://')
      : this.baseUrl.replace('http://', 'ws://')

    const socket = new WebSocket(`${wsBase}/ws/recordings/${input.recording.id}/stream`)
    let running = true

    socket.addEventListener('open', () => {
      input.callbacks.onState({
        status: 'recording',
        message: 'Python stream connected',
      })
    })

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as {
          type?: string
          data?: unknown
          error?: string
        }

        if (payload.type === 'recording.frame' && payload.data) {
          input.callbacks.onFrame(payload.data as Parameters<typeof input.callbacks.onFrame>[0])
          return
        }

        if (payload.type === 'recording.state' && payload.data) {
          input.callbacks.onState(payload.data as Parameters<typeof input.callbacks.onState>[0])
          return
        }

        if (payload.type === 'recording.done' && payload.data) {
          input.callbacks.onDone(payload.data as Parameters<typeof input.callbacks.onDone>[0])
          return
        }

        if (payload.type === 'error' || payload.error) {
          input.callbacks.onError(new Error(payload.error ?? 'Python stream returned an error'))
        }
      } catch {
        input.callbacks.onError(new Error('Failed to parse Python stream message'))
      }
    })

    socket.addEventListener('error', () => {
      input.callbacks.onError(new Error('Python stream socket error'))
    })

    socket.addEventListener('close', () => {
      if (!running) {
        return
      }

      running = false
      input.callbacks.onDone({
        recordingId: input.recording.id,
        reason: 'completed',
      })
    })

    return {
      stop: () => {
        if (!running) {
          return
        }

        running = false
        socket.close()
      },
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw upstreamError(`Python provider request failed with status ${response.status}`)
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw upstreamError('Python provider request timed out')
      }

      throw upstreamError(
        error instanceof Error
          ? error.message
          : 'Unknown error while calling Python provider',
      )
    } finally {
      clearTimeout(timeout)
    }
  }
}
