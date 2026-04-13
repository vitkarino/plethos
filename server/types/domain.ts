export type RecordingStatus = 'recording' | 'stopped' | 'extracted' | 'failed'

export interface RecordingRawData {
  provider?: Record<string, unknown>
  samples: number[]
  extracted?: Record<string, unknown>
}

export interface SignalFrame {
  sequence: number
  timestamp: string
  values: number[]
  sampleRate: number
}

export interface RecordingState {
  status: RecordingStatus
  message?: string
}

export interface RecordingExtractResult {
  bpm: number
  quality: number
  summary: string
  features: {
    avg: number
    min: number
    max: number
  }
}

export interface StreamDonePayload {
  recordingId: string
  reason: 'stopped' | 'completed'
}
