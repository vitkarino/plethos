import { randomUUID } from 'node:crypto'
import type { Recording } from '../db/schema'
import { ProjectsRepository } from '../repositories/projectsRepository'
import {
  RecordingsRepository,
  type RecordingsListFilters,
} from '../repositories/recordingsRepository'
import { UsersRepository } from '../repositories/usersRepository'
import type { ListResult } from '../types/api'
import type { RecordingStatus } from '../types/domain'
import { conflict, notFound } from '../utils/errors'
import type {
  SignalProvider,
  StreamRecordingCallbacks,
  StreamSession,
} from '../providers/signalProvider'

interface StartRecordingPayload {
  userId: string
  projectId: string
  signalType: string
  sampleRate: number
}

export class RecordingsService {
  public constructor(
    private readonly recordingsRepository: RecordingsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly signalProvider: SignalProvider,
  ) {}

  public listRecordings(
    filters: RecordingsListFilters,
    limit: number,
    offset: number,
  ): Promise<ListResult<Recording>> {
    return this.recordingsRepository.list(filters, limit, offset)
  }

  public async getRecording(id: string): Promise<Recording> {
    const recording = await this.recordingsRepository.getById(id)

    if (!recording) {
      throw notFound(`Recording ${id} was not found`)
    }

    return recording
  }

  public async startRecording(payload: StartRecordingPayload): Promise<Recording> {
    const [user, project] = await Promise.all([
      this.usersRepository.getById(payload.userId),
      this.projectsRepository.getById(payload.projectId),
    ])

    if (!user) {
      throw notFound(`User ${payload.userId} was not found`)
    }

    if (!project) {
      throw notFound(`Project ${payload.projectId} was not found`)
    }

    const id = randomUUID()
    const startedAt = new Date()

    const providerResult = await this.signalProvider.startRecording({
      recordingId: id,
      userId: payload.userId,
      projectId: payload.projectId,
      signalType: payload.signalType,
      sampleRate: payload.sampleRate,
      startedAt,
    })

    return this.recordingsRepository.create({
      id,
      userId: payload.userId,
      projectId: payload.projectId,
      status: 'recording',
      signalType: payload.signalType,
      sampleRate: payload.sampleRate,
      startedAt,
      rawData: {
        provider: {
          mode: process.env.PYTHON_PROVIDER_MODE ?? 'mock',
          ...(providerResult.providerData ?? {}),
        },
        samples: [],
      },
    })
  }

  public async stopRecording(id: string): Promise<Recording> {
    const recording = await this.getRecording(id)

    if (recording.status !== 'recording') {
      throw conflict(`Recording ${id} is already ${recording.status}`)
    }

    const stopped = await this.signalProvider.stopRecording({ recording })
    const durationMs = Math.max(0, stopped.finishedAt.getTime() - recording.startedAt.getTime())

    const rawData = {
      ...(recording.rawData ?? { samples: [] }),
      samples: stopped.samples,
      provider: {
        ...((recording.rawData?.provider as Record<string, unknown>) ?? {}),
        ...(stopped.providerData ? { stop: stopped.providerData } : {}),
      },
    }

    const updated = await this.recordingsRepository.updateStatusAndRawData(id, 'stopped', rawData, {
      finishedAt: stopped.finishedAt,
      durationMs,
    })

    if (!updated) {
      throw notFound(`Recording ${id} was not found after stop`)
    }

    return updated
  }

  public async extractRecording(id: string): Promise<Recording> {
    const recording = await this.getRecording(id)

    if (recording.status === 'recording') {
      throw conflict(`Recording ${id} is still running`)
    }

    const extraction = await this.signalProvider.extractRecording({ recording })

    const rawData = {
      ...(recording.rawData ?? { samples: [] }),
      extracted: extraction.extracted as Record<string, unknown>,
      provider: {
        ...((recording.rawData?.provider as Record<string, unknown>) ?? {}),
        ...(extraction.providerData ? { extract: extraction.providerData } : {}),
      },
    }

    const updated = await this.recordingsRepository.updateStatusAndRawData(
      id,
      'extracted',
      rawData,
    )

    if (!updated) {
      throw notFound(`Recording ${id} was not found after extraction`)
    }

    return updated
  }

  public async streamRecording(
    id: string,
    callbacks: StreamRecordingCallbacks,
  ): Promise<StreamSession> {
    const recording = await this.getRecording(id)

    return this.signalProvider.streamRecording({
      recording,
      callbacks,
      isRecordingActive: async () => {
        const fresh = await this.recordingsRepository.getById(id)
        return fresh?.status === 'recording'
      },
    })
  }

  public isRecordingFinal(status: RecordingStatus): boolean {
    return status === 'stopped' || status === 'extracted' || status === 'failed'
  }
}
