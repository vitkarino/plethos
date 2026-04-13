import type { Recording } from '../db/schema'
import type {
  RecordingExtractResult,
  RecordingState,
  SignalFrame,
  StreamDonePayload,
} from '../types/domain'

export interface StartRecordingInput {
  recordingId: string
  userId: string
  projectId: string
  signalType: string
  sampleRate: number
  startedAt: Date
}

export interface StopRecordingInput {
  recording: Recording
}

export interface ExtractRecordingInput {
  recording: Recording
}

export interface StreamRecordingCallbacks {
  onFrame: (frame: SignalFrame) => void
  onState: (state: RecordingState) => void
  onDone: (payload: StreamDonePayload) => void
  onError: (error: Error) => void
}

export interface StreamRecordingInput {
  recording: Recording
  isRecordingActive: () => Promise<boolean>
  callbacks: StreamRecordingCallbacks
}

export interface StreamSession {
  stop: () => void
}

export interface StartRecordingResult {
  providerData?: Record<string, unknown>
}

export interface StopRecordingResult {
  finishedAt: Date
  samples: number[]
  providerData?: Record<string, unknown>
}

export interface ExtractRecordingResult {
  extracted: RecordingExtractResult
  providerData?: Record<string, unknown>
}

export interface SignalProvider {
  startRecording(input: StartRecordingInput): Promise<StartRecordingResult>
  stopRecording(input: StopRecordingInput): Promise<StopRecordingResult>
  extractRecording(input: ExtractRecordingInput): Promise<ExtractRecordingResult>
  streamRecording(input: StreamRecordingInput): Promise<StreamSession> | StreamSession
}
