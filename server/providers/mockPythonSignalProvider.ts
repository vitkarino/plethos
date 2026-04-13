import type { RecordingStatus } from '../types/domain'
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

function hashSeed(value: string): number {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash) + 1
}

function makeSample(seed: number, sampleIndex: number, signalType: string): number {
  const frequencyBase = signalType.toLowerCase() === 'ecg' ? 0.12 : 0.08
  const wave = Math.sin((sampleIndex + seed) * frequencyBase)
  const harmonic = Math.sin((sampleIndex + seed) * frequencyBase * 2.5) * 0.35
  const drift = Math.sin((sampleIndex + seed) * 0.01) * 0.08

  return Number((wave + harmonic + drift).toFixed(6))
}

function normalizeStatus(status: RecordingStatus): RecordingStatus {
  if (status === 'failed') {
    return 'failed'
  }

  if (status === 'recording') {
    return 'recording'
  }

  return 'stopped'
}

export class MockPythonSignalProvider implements SignalProvider {
  public async startRecording(input: StartRecordingInput): Promise<StartRecordingResult> {
    return {
      providerData: {
        mode: 'mock',
        seed: hashSeed(input.recordingId),
        startedAt: input.startedAt.toISOString(),
      },
    }
  }

  public async stopRecording(input: StopRecordingInput): Promise<StopRecordingResult> {
    const finishedAt = new Date()
    const elapsedMs = Math.max(1_000, finishedAt.getTime() - input.recording.startedAt.getTime())
    const targetSamples = Math.min(
      Math.max(64, Math.floor((elapsedMs / 1000) * input.recording.sampleRate)),
      input.recording.sampleRate * 45,
    )

    const seed = hashSeed(input.recording.id)
    const samples = Array.from({ length: targetSamples }, (_, index) =>
      makeSample(seed, index, input.recording.signalType),
    )

    return {
      finishedAt,
      samples,
      providerData: {
        mode: 'mock',
        sampleCount: targetSamples,
      },
    }
  }

  public async extractRecording(input: ExtractRecordingInput): Promise<ExtractRecordingResult> {
    const seed = hashSeed(input.recording.id)
    const rawSamples = input.recording.rawData?.samples ?? []
    const samples = rawSamples.length > 0
      ? rawSamples
      : Array.from({ length: 300 }, (_, index) => makeSample(seed, index, input.recording.signalType))

    const min = Math.min(...samples)
    const max = Math.max(...samples)
    const avg = samples.reduce((acc, sample) => acc + sample, 0) / samples.length

    const bpm = 60 + (seed % 65)
    const quality = Number((0.75 + ((seed % 20) / 100)).toFixed(2))

    return {
      extracted: {
        bpm,
        quality,
        summary: 'Mock extraction based on deterministic waveform',
        features: {
          avg: Number(avg.toFixed(4)),
          min: Number(min.toFixed(4)),
          max: Number(max.toFixed(4)),
        },
      },
      providerData: {
        mode: 'mock',
        sourceStatus: normalizeStatus(input.recording.status),
      },
    }
  }

  public streamRecording(input: StreamRecordingInput): StreamSession {
    const seed = hashSeed(input.recording.id)
    const intervalMs = 250
    const frameSize = Math.max(4, Math.floor((input.recording.sampleRate * intervalMs) / 1000))

    let running = true
    let sequence = 0
    let busy = false

    input.callbacks.onState({
      status: 'recording',
      message: 'Mock stream started',
    })

    const tick = async () => {
      if (!running || busy) {
        return
      }

      busy = true

      try {
        const active = await input.isRecordingActive()

        if (!active) {
          running = false
          clearInterval(timer)

          input.callbacks.onState({
            status: 'stopped',
            message: 'Recording stopped',
          })

          input.callbacks.onDone({
            recordingId: input.recording.id,
            reason: 'stopped',
          })

          return
        }

        const values = Array.from({ length: frameSize }, (_, index) =>
          makeSample(seed, sequence * frameSize + index, input.recording.signalType),
        )

        input.callbacks.onFrame({
          sequence,
          timestamp: new Date().toISOString(),
          values,
          sampleRate: input.recording.sampleRate,
        })

        sequence += 1
      } catch (error) {
        running = false
        clearInterval(timer)
        input.callbacks.onError(
          error instanceof Error ? error : new Error('Mock stream failed unexpectedly'),
        )
      } finally {
        busy = false
      }
    }

    const timer = setInterval(() => {
      void tick()
    }, intervalMs)

    void tick()

    return {
      stop: () => {
        if (!running) {
          return
        }

        running = false
        clearInterval(timer)
      },
    }
  }
}
