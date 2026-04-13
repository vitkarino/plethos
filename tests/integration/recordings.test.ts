import { beforeAll, describe, expect, it } from 'vitest'
import { apiFetch } from './apiClient'
import { bootstrapIntegrationSuite } from './bootstrap'
import { expectApiError } from './helpers'

const userId = '11111111-1111-4111-8111-111111111111'
const projectId = 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1'

describe('Recordings API', () => {
  beforeAll(async () => {
    await bootstrapIntegrationSuite()
  })

  it('supports lifecycle start -> stop -> extract', async () => {
    const created = await apiFetch('/api/recordings/start', {
      method: 'POST',
      body: {
        userId,
        projectId,
        signalType: 'ecg',
        sampleRate: 128,
      },
    })

    const recordingId = created.data.id
    expect(created.data.status).toBe('recording')

    const fetched = await apiFetch(`/api/recordings/${recordingId}`)
    expect(fetched.data.id).toBe(recordingId)

    const list = await apiFetch('/api/recordings?status=recording&limit=10&offset=0')
    expect(list.data.some((recording: { id: string }) => recording.id === recordingId)).toBe(true)

    const stopped = await apiFetch(`/api/recordings/${recordingId}/stop`, {
      method: 'POST',
    })

    expect(stopped.data.status).toBe('stopped')
    expect(stopped.data.durationMs).toBeTypeOf('number')

    await expectApiError(
      () =>
        apiFetch(`/api/recordings/${recordingId}/stop`, {
          method: 'POST',
        }),
      409,
      'CONFLICT',
    )

    const extracted = await apiFetch(`/api/recordings/${recordingId}/extract`, {
      method: 'POST',
    })

    expect(extracted.data.status).toBe('extracted')
    expect(extracted.data.rawData.extracted).toBeDefined()
  })

  it('returns 422 for invalid start payload', async () => {
    await expectApiError(
      () =>
        apiFetch('/api/recordings/start', {
          method: 'POST',
          body: {
            userId: 'wrong-id',
            projectId,
            signalType: 'ecg',
            sampleRate: 128,
          },
        }),
      422,
      'VALIDATION_ERROR',
    )
  })

  it('returns 404 for unknown recording', async () => {
    await expectApiError(
      () => apiFetch('/api/recordings/ffffffff-ffff-4fff-8fff-ffffffffffff'),
      404,
      'NOT_FOUND',
    )
  })
})
