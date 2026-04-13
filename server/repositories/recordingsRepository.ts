import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { recordings, type NewRecording, type Recording } from '../db/schema'
import type { ListResult } from '../types/api'
import type { RecordingRawData, RecordingStatus } from '../types/domain'

export interface RecordingsListFilters {
  userId?: string
  projectId?: string
  status?: RecordingStatus
}

export class RecordingsRepository {
  public async list(
    filters: RecordingsListFilters,
    limit: number,
    offset: number,
  ): Promise<ListResult<Recording>> {
    const where = this.buildWhere(filters)

    const totalQuery = db.select({ value: count() }).from(recordings)
    const itemsQuery = db
      .select()
      .from(recordings)
      .orderBy(desc(recordings.startedAt))
      .limit(limit)
      .offset(offset)

    const [totalRow] = where ? await totalQuery.where(where) : await totalQuery
    const items = where ? await itemsQuery.where(where) : await itemsQuery

    return {
      items,
      total: Number(totalRow?.value ?? 0),
    }
  }

  public async getById(id: string): Promise<Recording | null> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.id, id)).limit(1)
    return recording ?? null
  }

  public async create(payload: NewRecording): Promise<Recording> {
    const [recording] = await db.insert(recordings).values(payload).returning()
    return recording
  }

  public async update(
    id: string,
    patch: Partial<
      Pick<
        NewRecording,
        'status' | 'finishedAt' | 'durationMs' | 'rawData' | 'sampleRate' | 'signalType'
      >
    >,
  ): Promise<Recording | null> {
    const [recording] = await db
      .update(recordings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(recordings.id, id))
      .returning()

    return recording ?? null
  }

  public async updateStatusAndRawData(
    id: string,
    status: RecordingStatus,
    rawData: RecordingRawData,
    extra: {
      finishedAt?: Date
      durationMs?: number
    } = {},
  ): Promise<Recording | null> {
    return this.update(id, {
      status,
      rawData,
      ...(extra.finishedAt ? { finishedAt: extra.finishedAt } : {}),
      ...(typeof extra.durationMs === 'number' ? { durationMs: extra.durationMs } : {}),
    })
  }

  private buildWhere(filters: RecordingsListFilters) {
    const conditions = []

    if (filters.userId) {
      conditions.push(eq(recordings.userId, filters.userId))
    }

    if (filters.projectId) {
      conditions.push(eq(recordings.projectId, filters.projectId))
    }

    if (filters.status) {
      conditions.push(eq(recordings.status, filters.status))
    }

    if (conditions.length === 0) {
      return undefined
    }

    return and(...conditions)
  }
}
